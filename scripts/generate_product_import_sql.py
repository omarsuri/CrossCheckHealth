import json
import math
import re
from pathlib import Path

import pandas as pd


INPUT_XLSX = Path(r"C:\Users\faroo\Downloads\indian_health_product_database_reviewed_verified.xlsx")
OUTPUT_SQL = Path(__file__).resolve().parents[1] / "supabase" / "import-indian-health-products.sql"


def clean(value):
    if pd.isna(value):
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value).strip()
    return text if text and text.lower() != "nan" else None


def sql_text(value):
    value = clean(value)
    if value is None:
        return "null"
    return "'" + value.replace("'", "''") + "'"


def sql_number(value, default_null=True):
    if pd.isna(value):
        return "null" if default_null else "0"
    try:
        parsed = float(value)
    except Exception:
        return "null" if default_null else "0"
    if math.isnan(parsed):
        return "null" if default_null else "0"
    return str(int(parsed)) if parsed.is_integer() else str(round(parsed, 2))


def slugify(value):
    value = (clean(value) or "wellness").lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "wellness"


def form_from_subcategory(value):
    text = (clean(value) or "product").lower()
    for key in [
        "capsule",
        "tablet",
        "syrup",
        "powder",
        "protein powder",
        "bp monitor",
        "glucometer",
        "thermometer",
        "skin care",
        "hair care",
    ]:
        if key in text:
            return key.replace(" ", "-")
    return slugify(text)


def diet_label(category, subcategory, name):
    text = " ".join([clean(category) or "", clean(subcategory) or "", clean(name) or ""]).lower()
    non_food = ["baby", "device", "monitor", "glucometer", "thermometer", "skin", "hair", "face wash", "shampoo"]
    if any(item in text for item in non_food):
        return None
    return "Not listed"


def score_for(row):
    risk = (clean(row.get("compliance_risk")) or "").lower()
    category = (clean(row.get("category")) or "").lower()
    has_source = bool(clean(row.get("source_url")))
    science = 70 if category in ["device", "nutrition"] else 62 if category in ["supplement", "ayurveda"] else 55
    value = 60
    if not pd.isna(row.get("sale_price")) and not pd.isna(row.get("mrp")):
        value = 75 if float(row.get("sale_price")) <= float(row.get("mrp")) else 55
    safety = 78 if risk == "low" else 66 if risk == "medium" else 50
    efficacy = 68 if category in ["device", "nutrition"] else 58
    transparency = 78 if has_source else 55
    family = 70 if category != "baby care" else 60
    overall = round((science + value + safety + efficacy + transparency + family) / 6)
    return science, value, safety, efficacy, transparency, family, overall


def verdict_for(row):
    risk = (clean(row.get("compliance_risk")) or "").lower()
    if risk == "high":
        return "Use With Caution", "no", "Needs source review before publishing or recommending."
    if risk == "medium":
        return "Compare First", "conditional", "Approved workbook row; compare source, label and price before deciding."
    return "Strong Choice", "yes", "Approved workbook row with lower compliance risk and clear source record."


def main():
    df = pd.read_excel(INPUT_XLSX, sheet_name="Product_Data")
    df = df[df["status"].astype(str).str.lower().eq("approved")].copy()

    category_pairs = sorted({(clean(category), slugify(category)) for category in df["category"] if clean(category)})
    product_rows = []
    score_rows = []
    ingredient_rows = []
    warning_rows = []
    tag_rows = []

    for _, row in df.iterrows():
        source_product_id = clean(row["product_id"])
        name = clean(row["product_name"])
        brand = clean(row["brand"])
        category = clean(row["category"])
        category_slug = slugify(category)
        subcategory = clean(row["subcategory"])
        form = form_from_subcategory(subcategory)
        diet = diet_label(category, subcategory, name)
        price_unit = " / " + (clean(row.get("pack_size_text")) or clean(row.get("unit")) or "pack")
        verdict, verdict_key, interpretation = verdict_for(row)
        practical_take = clean(row.get("description_short")) or interpretation
        source_name = clean(row.get("source_name")) or "Workbook source"
        source_url = clean(row.get("source_url"))
        risk = clean(row.get("compliance_risk")) or "Not listed"
        description = clean(row.get("description_short")) or name
        specs = clean(row.get("strength_or_specs")) or clean(row.get("pack_size_text")) or "Not listed"
        is_vegetarian = "true" if diet == "Vegetarian" else "false"
        chips = ["Demo Data", f"{risk} Compliance Risk"]
        if diet:
            chips.append(diet)
        if clean(row.get("source_type")):
            chips.append(clean(row.get("source_type"))[:40])

        product_rows.append(
            "("
            + ", ".join(
                [
                    sql_text(source_product_id),
                    sql_text(name),
                    sql_text(brand),
                    f"(select id from product_categories where slug={sql_text(category_slug)})",
                    sql_text(category),
                    sql_text(category_slug),
                    sql_text(subcategory),
                    sql_text(form),
                    "null",
                    sql_number(row.get("sale_price")),
                    sql_number(row.get("mrp")),
                    sql_text(price_unit),
                    sql_text(clean(row.get("currency")) or "INR"),
                    sql_number(row.get("rating")),
                    sql_number(row.get("reviews_count"), default_null=False),
                    "false",
                    "false",
                    "false",
                    is_vegetarian,
                    "false",
                    sql_text(diet),
                    sql_text(verdict),
                    sql_text(interpretation),
                    sql_text(practical_take),
                    sql_text(name),
                    sql_text(description),
                    sql_text(source_url),
                    sql_text(clean(row.get("image_url"))),
                    sql_text(json.dumps([source_name])),
                    sql_text(json.dumps(chips)),
                    sql_text("Source: " + source_name + ". " + (clean(row.get("notes")) or "Imported from reviewed workbook.")),
                    sql_text("Source URL and permission notes should be reviewed before publishing claims."),
                    sql_text("Preventive product catalogue entry only; not medical advice."),
                    sql_text("Compliance risk: " + risk + ". " + (clean(row.get("copyright_notes")) or "")),
                    sql_text("Source-reviewed"),
                    "true",
                ]
            )
            + ")"
        )

        science, value, safety, efficacy, transparency, family, overall = score_for(row)
        score_rows.append(
            f"({sql_text(source_product_id)}, {science}, {value}, {safety}, {family}, {family}, {transparency}, {efficacy}, 20, {overall}, {sql_text(verdict)}, {sql_text(verdict_key)}, {sql_text(interpretation)})"
        )

        ingredient = clean(row.get("key_ingredients")) or specs or name
        ingredient_rows.append(
            f"({sql_text(source_product_id)}, {sql_text(ingredient)}, {sql_text(specs)}, 'und', 'not specified', {sql_text(subcategory or 'Product component')}, {sql_text('Workbook listed ingredient/spec: ' + ingredient)})"
        )

        if risk.lower() == "high":
            warning_rows.append(
                f"({sql_text(source_product_id)}, 'Compliance review needed', {sql_text('High compliance risk in workbook; verify source permission and claims before publishing.')}, 'high', 'Needs review')"
            )
        elif risk.lower() == "medium":
            warning_rows.append(
                f"({sql_text(source_product_id)}, 'Source context check', {sql_text('Medium compliance risk in workbook; confirm source permission and volatile price fields before publishing.')}, 'medium', 'Compare first')"
            )

        for chip in chips:
            tag_rows.append(f"({sql_text(source_product_id)}, {sql_text(chip)}, 'import')")

    lines = [
        "-- Auto-generated from indian_health_product_database_reviewed_verified.xlsx",
        "-- Run product-reference-ui-migration.sql before this import.",
        "",
        "alter table products add column if not exists source_product_id text;",
        "drop index if exists products_source_product_id_key;",
        "create unique index if not exists products_source_product_id_key on products(source_product_id);",
        "",
        "insert into product_categories (name, slug) values",
        ",\n".join(f"  ({sql_text(name)}, {sql_text(slug)})" for name, slug in category_pairs) + "\non conflict (slug) do nothing;",
        "",
        "insert into products (source_product_id, name, brand, category_id, category, cat, subcategory, form, diet_type, price, original_price, price_unit, currency, rating, review_count, is_fssai_certified, is_lab_tested, is_sugar_free, is_vegetarian, safe_for_elderly, diet_label, verdict, interpretation, practical_take, usp_headline, usp_context, affiliate_url, image_url, certifications, chips, ingredient_research, consumer_transparency, wellness_context, exposure_interpretation, evidence_strength, is_active) values",
        ",\n".join("  " + row for row in product_rows),
        "on conflict (source_product_id) do update set\n  name=excluded.name, brand=excluded.brand, category_id=excluded.category_id, category=excluded.category, cat=excluded.cat, subcategory=excluded.subcategory, form=excluded.form, price=excluded.price, original_price=excluded.original_price, price_unit=excluded.price_unit, currency=excluded.currency, rating=excluded.rating, review_count=excluded.review_count, diet_label=excluded.diet_label, verdict=excluded.verdict, interpretation=excluded.interpretation, practical_take=excluded.practical_take, usp_headline=excluded.usp_headline, usp_context=excluded.usp_context, affiliate_url=excluded.affiliate_url, image_url=excluded.image_url, certifications=excluded.certifications, chips=excluded.chips, ingredient_research=excluded.ingredient_research, consumer_transparency=excluded.consumer_transparency, wellness_context=excluded.wellness_context, exposure_interpretation=excluded.exposure_interpretation, evidence_strength=excluded.evidence_strength, updated_at=now();",
        "",
        "delete from product_scores where product_id in (select id from products where source_product_id like 'IN-%');",
        "insert into product_scores (product_id, science_score, value_score, safety_score, parent_score, family_safety_score, transparency_score, efficacy_score, hype_score, overall_score, verdict, verdict_key, verdict_text)",
        "select p.id, v.science_score, v.value_score, v.safety_score, v.parent_score, v.family_safety_score, v.transparency_score, v.efficacy_score, v.hype_score, v.overall_score, v.verdict, v.verdict_key, v.verdict_text from (values",
        ",\n".join("  " + row for row in score_rows),
        ") as v(source_product_id, science_score, value_score, safety_score, parent_score, family_safety_score, transparency_score, efficacy_score, hype_score, overall_score, verdict, verdict_key, verdict_text) join products p on p.source_product_id=v.source_product_id;",
        "",
        "delete from product_ingredients where product_id in (select id from products where source_product_id like 'IN-%');",
        "insert into product_ingredients (product_id, ingredient_name, amount, status, evidence_level, ingredient_type, microcopy)",
        "select p.id, v.ingredient_name, v.amount, v.status, v.evidence_level, v.ingredient_type, v.microcopy from (values",
        ",\n".join("  " + row for row in ingredient_rows),
        ") as v(source_product_id, ingredient_name, amount, status, evidence_level, ingredient_type, microcopy) join products p on p.source_product_id=v.source_product_id;",
        "",
        "delete from product_warnings where product_id in (select id from products where source_product_id like 'IN-%');",
    ]
    if warning_rows:
        lines.extend(
            [
                "insert into product_warnings (product_id, warning_title, warning_text, severity, caution_label)",
                "select p.id, v.warning_title, v.warning_text, v.severity, v.caution_label from (values",
                ",\n".join("  " + row for row in warning_rows),
                ") as v(source_product_id, warning_title, warning_text, severity, caution_label) join products p on p.source_product_id=v.source_product_id;",
            ]
        )
    lines.extend(
        [
            "",
            "delete from product_tags where product_id in (select id from products where source_product_id like 'IN-%');",
            "insert into product_tags (product_id, label, tag_type)",
            "select p.id, v.label, v.tag_type from (values",
            ",\n".join("  " + row for row in tag_rows),
            ") as v(source_product_id, label, tag_type) join products p on p.source_product_id=v.source_product_id on conflict (product_id, label) do nothing;",
            "",
        ]
    )

    OUTPUT_SQL.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUTPUT_SQL}")
    print(f"Products: {len(product_rows)}")
    print(f"Warnings: {len(warning_rows)}")


if __name__ == "__main__":
    main()
