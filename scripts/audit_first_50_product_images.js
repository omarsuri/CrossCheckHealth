const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INPUT_FILE = path.join(PROJECT_ROOT, "data", "product-imports", "indian_health_products_with_image_links_pass1.xlsx");

function readEnv() {
  const env = { ...process.env };
  const envPath = path.join(PROJECT_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[trimmed.slice(0, index).trim()] = value;
  }
  return env;
}

function safeString(value) {
  return String(value ?? "").trim();
}

function readRows() {
  const workbook = xlsx.readFile(INPUT_FILE);
  const sheet = workbook.Sheets.Products || workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet, { defval: "" }).slice(0, 50).map((row, index) => ({
    row_number: index + 2,
    name: safeString(row["Product Name"]),
    brand: safeString(row["Brand"]),
    category: safeString(row["Category"]),
  }));
}

async function main() {
  const env = readEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const audit = [];
  for (const row of readRows()) {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,brand,category,image_url,image_source_url")
      .eq("name", row.name)
      .eq("brand", row.brand)
      .eq("category", row.category);
    if (error) throw error;
    const matches = data || [];
    audit.push({
      row_number: row.row_number,
      product_name: row.name,
      matches: matches.length,
      image_urls: matches.map((product) => product.image_url || ""),
      storage_image_records: matches.filter((product) => String(product.image_url || "").includes("/storage/v1/object/public/product-images/")).length,
      old_or_non_storage_image_records: matches.filter((product) => product.image_url && !String(product.image_url).includes("/storage/v1/object/public/product-images/")).length,
      missing_image_records: matches.filter((product) => !product.image_url).length,
    });
  }

  const summary = {
    sheet_rows_audited: audit.length,
    unique_matched_rows: audit.filter((row) => row.matches === 1).length,
    ambiguous_or_missing_rows: audit.filter((row) => row.matches !== 1).length,
    rows_with_old_or_non_storage_images: audit.filter((row) => row.old_or_non_storage_image_records > 0).length,
    rows_with_missing_images: audit.filter((row) => row.missing_image_records > 0).length,
    rows_fully_using_product_images_bucket: audit.filter((row) => row.matches > 0 && row.storage_image_records === row.matches).length,
    old_or_non_storage: audit.filter((row) => row.old_or_non_storage_image_records > 0),
    missing: audit.filter((row) => row.missing_image_records > 0),
    ambiguous_or_missing: audit.filter((row) => row.matches !== 1),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
