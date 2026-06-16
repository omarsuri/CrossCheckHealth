const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INPUT_FILE = path.join(PROJECT_ROOT, "data", "product-imports", "indian_health_products_with_image_links_pass1.xlsx");
const SHEET_NAME = "Products";
const BUCKET = "product-images";
const BACKUP_DIR = path.join(PROJECT_ROOT, "backups");
const LOG_DIR = path.join(PROJECT_ROOT, "scripts", "logs");
const REQUEST_TIMEOUT_MS = 25000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const REQUIRED_OPTIONAL_COLUMNS = [
  "main_ingredients",
  "key_specs",
  "ingredient_source_name",
  "ingredient_source_url",
  "ingredient_verified",
  "ingredient_checked_at",
  "ingredient_review_status",
];

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[trimmed.slice(0, index).trim()] = value;
  }
  return env;
}

function safeString(value) {
  return String(value ?? "").trim();
}

function slugify(value) {
  return (
    safeString(value)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "product"
  );
}

function parseArgs() {
  const getNumberArg = (name) => {
    const prefix = `${name}=`;
    const inline = process.argv.find((arg) => arg.startsWith(prefix));
    const raw = inline ? inline.slice(prefix.length) : process.argv[process.argv.indexOf(name) + 1];
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const getStringArg = (name) => {
    const prefix = `${name}=`;
    const inline = process.argv.find((arg) => arg.startsWith(prefix));
    if (inline) return inline.slice(prefix.length);
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] || "" : "";
  };
  const rowsArg = getStringArg("--rows");

  return {
    dryRun: process.argv.includes("--dry-run"),
    apply: process.argv.includes("--apply"),
    overwrite: process.argv.includes("--overwrite"),
    insertMissing: process.argv.includes("--insert-missing"),
    startRow: getNumberArg("--start-row"),
    endRow: getNumberArg("--end-row"),
    rows: rowsArg
      ? rowsArg
          .split(",")
          .map((value) => Number.parseInt(value.trim(), 10))
          .filter((value) => Number.isFinite(value) && value > 0)
      : [],
  };
}

function assertMode(args) {
  if (args.dryRun === args.apply) {
    throw new Error("Pass exactly one mode: --dry-run or --apply");
  }
  if (args.rows.length === 0 && (!args.startRow || !args.endRow || args.startRow < 1 || args.endRow < args.startRow)) {
    throw new Error("Pass a valid product row range, for example: --start-row 51 --end-row 101, or targeted rows: --rows 51,56,57");
  }
}

function readSheetRows(startRow, endRow) {
  if (!fs.existsSync(INPUT_FILE)) throw new Error(`Input workbook not found: ${INPUT_FILE}`);
  const workbook = xlsx.readFile(INPUT_FILE, { cellDates: true });
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) throw new Error(`Sheet '${SHEET_NAME}' not found in ${INPUT_FILE}`);
  return xlsx.utils.sheet_to_json(sheet, { defval: "" }).slice(startRow - 1, endRow).map((row, index) => ({
    product_sheet_row_number: startRow + index,
    excel_row_number: startRow + index + 1,
    category: safeString(row["Category"]),
    product_name: safeString(row["Product Name"]),
    brand: safeString(row["Brand"]),
    product_type: safeString(row["Product Type"]),
    primary_use: safeString(row["Primary Use / Positioning"]),
    form: safeString(row["Form"]),
    pack_variant: safeString(row["Pack / Variant"]),
    key_ingredients_specs: safeString(row["Key Ingredients / Specs"]),
    source_name: safeString(row["Source Name"]),
    source_url: safeString(row["Source URL"]),
    product_image_link: safeString(row["Product Image Link"]),
    image_status: safeString(row["Image Status"]),
    india_availability_evidence: safeString(row["India Availability Evidence"]),
    review_status: safeString(row["Review Status"]),
    last_checked: normalizeDate(row["Last Checked"]),
    image_link_type: safeString(row["Image Link Type"]),
    image_verification_notes: safeString(row["Image Verification Notes"]),
  }));
}

function readSelectedSheetRows(productRows) {
  if (!fs.existsSync(INPUT_FILE)) throw new Error(`Input workbook not found: ${INPUT_FILE}`);
  const workbook = xlsx.readFile(INPUT_FILE, { cellDates: true });
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) throw new Error(`Sheet '${SHEET_NAME}' not found in ${INPUT_FILE}`);
  const allRows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  return [...new Set(productRows)].sort((a, b) => a - b).map((productRowNumber) => {
    const row = allRows[productRowNumber - 1];
    if (!row) throw new Error(`Product row ${productRowNumber} is outside the Products sheet range`);
    return {
      product_sheet_row_number: productRowNumber,
      excel_row_number: productRowNumber + 1,
      category: safeString(row["Category"]),
      product_name: safeString(row["Product Name"]),
      brand: safeString(row["Brand"]),
      product_type: safeString(row["Product Type"]),
      primary_use: safeString(row["Primary Use / Positioning"]),
      form: safeString(row["Form"]),
      pack_variant: safeString(row["Pack / Variant"]),
      key_ingredients_specs: safeString(row["Key Ingredients / Specs"]),
      source_name: safeString(row["Source Name"]),
      source_url: safeString(row["Source URL"]),
      product_image_link: safeString(row["Product Image Link"]),
      image_status: safeString(row["Image Status"]),
      india_availability_evidence: safeString(row["India Availability Evidence"]),
      review_status: safeString(row["Review Status"]),
      last_checked: normalizeDate(row["Last Checked"]),
      image_link_type: safeString(row["Image Link Type"]),
      image_verification_notes: safeString(row["Image Verification Notes"]),
    };
  });
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = safeString(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
}

function isDevice(row) {
  return safeString(row.category).toLowerCase() === "device";
}

function isSearchUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const full = parsed.href.toLowerCase();
    return (
      host.includes("google.") ||
      host.includes("bing.") ||
      host.includes("duckduckgo.") ||
      full.includes("/search?") ||
      full.includes("tbm=isch") ||
      full.includes("images/search")
    );
  } catch {
    return false;
  }
}

function hasDirectImageExtension(value) {
  return /\.(jpe?g|png|webp|avif)(?:[?#]|$)/i.test(value);
}

function parseSpecs(text) {
  const cleaned = safeString(text);
  if (!cleaned) return [];
  return cleaned
    .split(/\r?\n|;|,|\s\|\s/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((item) => ({ name: item }));
}

function parseMainIngredients(text) {
  const cleaned = safeString(text);
  if (!cleaned) return [];
  return cleaned
    .split(/\r?\n|;|,|\s\|\s/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const amountMatch = part.match(/\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|cfu|billion|%)[^,;]*)/i);
      return {
        name: amountMatch ? part.replace(amountMatch[0], "").replace(/[-:,()]+$/g, "").trim() || part : part,
        amount: amountMatch ? amountMatch[0].trim() : "",
      };
    });
}

function extensionFromContent(localPath, contentType) {
  const ext = path.extname(localPath || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(ext)) return ext;
  const lower = safeString(contentType).toLowerCase();
  if (lower.includes("png")) return ".png";
  if (lower.includes("webp")) return ".webp";
  if (lower.includes("avif")) return ".avif";
  return ".jpg";
}

async function checkIngredientColumns(supabase) {
  const { error } = await supabase.from("products").select(REQUIRED_OPTIONAL_COLUMNS.join(",")).limit(1);
  if (!error) return { ok: true, missing: [] };
  const message = error.message || "";
  const missing = REQUIRED_OPTIONAL_COLUMNS.filter((column) => message.includes(column));
  return { ok: false, missing: missing.length ? missing : REQUIRED_OPTIONAL_COLUMNS, error: message };
}

async function findMatches(supabase, row, ingredientColumnsAvailable) {
  const baseColumns = [
    "id",
    "name",
    "brand",
    "category",
    "product_type",
    "primary_use",
    "form",
    "pack_variant",
    "source_name",
    "source_url",
    "image_url",
    "image_source_url",
    "image_status",
    "image_link_type",
    "image_verification_notes",
    "india_availability_evidence",
    "review_status",
    "last_checked",
    "updated_at",
  ];
  const columns = ingredientColumnsAvailable ? [...baseColumns, ...REQUIRED_OPTIONAL_COLUMNS] : baseColumns;
  const { data, error } = await supabase
    .from("products")
    .select(columns.join(","))
    .eq("name", row.product_name)
    .eq("brand", row.brand)
    .eq("category", row.category);
  if (error) throw new Error(`Lookup failed for row ${row.excel_row_number}: ${error.message}`);
  return data || [];
}

async function findSameNameBrandMatches(supabase, row, ingredientColumnsAvailable) {
  const baseColumns = [
    "id",
    "name",
    "brand",
    "category",
    "product_type",
    "primary_use",
    "form",
    "pack_variant",
    "source_name",
    "source_url",
    "image_url",
    "image_source_url",
    "image_status",
    "image_link_type",
    "image_verification_notes",
    "india_availability_evidence",
    "review_status",
    "last_checked",
    "updated_at",
  ];
  const columns = ingredientColumnsAvailable ? [...baseColumns, ...REQUIRED_OPTIONAL_COLUMNS] : baseColumns;
  const { data, error } = await supabase
    .from("products")
    .select(columns.join(","))
    .ilike("name", row.product_name)
    .ilike("brand", row.brand);
  if (error) throw new Error(`Same-name lookup failed for row ${row.excel_row_number}: ${error.message}`);
  return data || [];
}

async function findSameNameProducts(supabase, row) {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,brand,category,source_product_id")
    .ilike("name", row.product_name);
  if (error) throw new Error(`Duplicate-name check failed for row ${row.excel_row_number}: ${error.message}`);
  return data || [];
}

async function downloadAndValidateImage(url) {
  if (!url || isSearchUrl(url)) return { valid: false, reason: "missing_or_search_url" };
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: "invalid_url" };
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return { valid: false, reason: "not_http_url" };

  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT_MS,
    maxRedirects: 5,
    responseType: "arraybuffer",
    headers: { "User-Agent": USER_AGENT, Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
    validateStatus: (status) => status >= 200 && status < 400,
  });
  const contentType = safeString(response.headers["content-type"]).split(";")[0];
  const buffer = Buffer.from(response.data);
  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(buffer);
  const imageContent = contentType.startsWith("image/") || Boolean(detected?.mime?.startsWith("image/"));
  return {
    valid: imageContent || hasDirectImageExtension(url),
    contentType: detected?.mime || contentType || "unknown",
    buffer,
    fileSizeKb: Math.round((buffer.length / 1024) * 10) / 10,
    reason: imageContent ? "image_content_type" : hasDirectImageExtension(url) ? "direct_image_extension" : "not_image_content",
  };
}

async function uploadImage(supabase, row, product, image) {
  const ext = extensionFromContent(row.product_image_link, image.contentType);
  const storagePath = `${slugify(row.category)}/${slugify(row.brand)}/${slugify(row.product_name)}-${product.id}${ext}`;
  const upload = await supabase.storage.from(BUCKET).upload(storagePath, image.buffer, {
    contentType: image.contentType || "image/jpeg",
    upsert: true,
  });
  if (upload.error) throw new Error(upload.error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return { storagePath, publicUrl: data.publicUrl };
}

function shouldSkipExistingImage(product, overwrite) {
  return !overwrite && Boolean(product.image_url);
}

function shouldSkipExistingIngredients(product, row, overwrite, ingredientColumnsAvailable) {
  if (overwrite || !ingredientColumnsAvailable) return false;
  if (isDevice(row)) {
    return Array.isArray(product.key_specs) && product.key_specs.length > 0;
  }
  return Boolean(product.ingredient_verified) && Array.isArray(product.main_ingredients) && product.main_ingredients.length > 0;
}

function buildUpdatePayload(row, imageResult, ingredientColumnsAvailable, overwrite, product) {
  const now = new Date().toISOString();
  const payload = {
    product_type: row.product_type || null,
    primary_use: row.primary_use || null,
    form: row.form || null,
    pack_variant: row.pack_variant || null,
    source_name: row.source_name || null,
    source_url: row.source_url || null,
    image_source_url: row.product_image_link || null,
    image_status: row.image_status || null,
    image_link_type: row.image_link_type || null,
    image_verification_notes: row.image_verification_notes || null,
    india_availability_evidence: row.india_availability_evidence || null,
    review_status: row.review_status || null,
    last_checked: row.last_checked,
    updated_at: now,
  };

  if (imageResult?.publicUrl && !shouldSkipExistingImage(product, overwrite)) {
    payload.image_url = imageResult.publicUrl;
  }

  if (ingredientColumnsAvailable && !shouldSkipExistingIngredients(product, row, overwrite, true)) {
    if (isDevice(row)) {
      payload.key_specs = parseSpecs(row.key_ingredients_specs);
      payload.ingredient_review_status = "not_applicable_device";
    } else {
      payload.main_ingredients = parseMainIngredients(row.key_ingredients_specs);
      payload.ingredient_source_name = row.source_name || null;
      payload.ingredient_source_url = row.source_url || null;
      payload.ingredient_verified = Boolean(row.source_url);
      payload.ingredient_review_status = "verified_from_sheet";
      payload.ingredient_checked_at = now;
    }
  }

  return payload;
}

function buildInsertPayload(row, imageResult, ingredientColumnsAvailable) {
  const now = new Date().toISOString();
  const categorySlug = slugify(row.category);
  const sourceProductId = `IMG-${categorySlug}-${slugify(row.brand)}-${slugify(row.product_name)}`;
  const payload = {
    source_product_id: sourceProductId,
    name: row.product_name,
    brand: row.brand || null,
    category: row.category || null,
    cat: categorySlug,
    subcategory: row.product_type || null,
    product_type: row.product_type || null,
    primary_use: row.primary_use || null,
    form: row.form || null,
    pack_variant: row.pack_variant || null,
    price: 0,
    original_price: 0,
    price_unit: row.pack_variant || "",
    currency: "INR",
    rating: 0,
    review_count: 0,
    verdict: "Compare First",
    interpretation: row.primary_use || row.product_type || "Product catalogue entry added from verified workbook row.",
    practical_take: row.primary_use || row.product_type || "Compare source details before purchase.",
    usp_headline: row.primary_use || row.product_type || null,
    usp_context: row.india_availability_evidence || null,
    affiliate_url: row.source_url || null,
    image_source_url: row.product_image_link || null,
    image_status: row.image_status || null,
    image_link_type: row.image_link_type || null,
    image_verification_notes: row.image_verification_notes || null,
    source_name: row.source_name || null,
    source_url: row.source_url || null,
    india_availability_evidence: row.india_availability_evidence || null,
    review_status: row.review_status || "verified_from_sheet",
    last_checked: row.last_checked,
    certifications: [],
    chips: [],
    ingredient_research: null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  if (imageResult?.publicUrl) {
    payload.image_url = imageResult.publicUrl;
  }

  if (ingredientColumnsAvailable) {
    if (isDevice(row)) {
      payload.key_specs = parseSpecs(row.key_ingredients_specs);
      payload.ingredient_review_status = "not_applicable_device";
    } else {
      payload.main_ingredients = parseMainIngredients(row.key_ingredients_specs);
      payload.ingredient_source_name = row.source_name || null;
      payload.ingredient_source_url = row.source_url || null;
      payload.ingredient_verified = Boolean(row.source_url);
      payload.ingredient_review_status = "verified_from_sheet";
      payload.ingredient_checked_at = now;
    }
  }

  return payload;
}

function ensureDirs() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

async function main() {
  const args = parseArgs();
  assertMode(args);
  ensureDirs();

  const env = readEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = args.rows.length > 0 ? readSelectedSheetRows(args.rows) : readSheetRows(args.startRow, args.endRow);
  const ingredientColumnCheck = await checkIngredientColumns(supabase);
  if (args.apply && !ingredientColumnCheck.ok) {
    throw new Error(
      `Required product columns are missing: ${ingredientColumnCheck.missing.join(", ")}. Run migration supabase/migrations/202606120001_first_50_product_update_columns.sql before --apply.`,
    );
  }

  const summary = {
    mode: args.dryRun ? "dry-run" : "apply",
    product_row_start: args.rows.length > 0 ? rows[0]?.product_sheet_row_number || null : args.startRow,
    product_row_end: args.rows.length > 0 ? rows[rows.length - 1]?.product_sheet_row_number || null : args.endRow,
    targeted_product_rows: args.rows.length > 0 ? rows.map((row) => row.product_sheet_row_number) : [],
    rows_processed: rows.length,
    matched_products: 0,
    missing_products_insert_planned: 0,
    inserted_products: 0,
    skipped_products: 0,
    images_valid: 0,
    images_uploaded_or_planned: 0,
    ingredients_specs_planned: 0,
    updated_products: 0,
    errors: [],
    migration_columns_available: ingredientColumnCheck.ok,
    missing_columns: ingredientColumnCheck.ok ? [] : ingredientColumnCheck.missing,
  };
  const skipped = [];
  const matchedBackups = [];
  const rowLogs = [];

  for (const row of rows) {
    const log = {
      product_row_number: row.product_sheet_row_number,
      excel_row_number: row.excel_row_number,
      product_name: row.product_name,
      brand: row.brand,
      category: row.category,
    };
    try {
      let matches = await findMatches(supabase, row, ingredientColumnCheck.ok);
      let matchStrategy = "exact_name_brand_category";
      if (matches.length === 0 && args.insertMissing) {
        const sameNameBrandMatches = await findSameNameBrandMatches(supabase, row, ingredientColumnCheck.ok);
        if (sameNameBrandMatches.length === 1) {
          matches = sameNameBrandMatches;
          matchStrategy = "same_name_brand_category_mismatch";
        } else if (sameNameBrandMatches.length > 1) {
          summary.skipped_products += 1;
          const reason = "multiple_same_name_brand_matches";
          skipped.push({ ...log, reason, matches_found: sameNameBrandMatches.length, same_name_brand_matches: sameNameBrandMatches });
          rowLogs.push({ ...log, status: "skipped", reason, matches_found: sameNameBrandMatches.length, same_name_brand_matches: sameNameBrandMatches });
          continue;
        }
      }

      if (matches.length === 0 && args.insertMissing) {
        const sameNameProducts = await findSameNameProducts(supabase, row);
        if (sameNameProducts.length > 0) {
          summary.skipped_products += 1;
          const reason = "duplicate_name_risk";
          skipped.push({ ...log, reason, matches_found: 0, same_name_matches: sameNameProducts });
          rowLogs.push({ ...log, status: "skipped", reason, matches_found: 0, same_name_matches: sameNameProducts });
          continue;
        }

        let imageValidation = null;
        let imageUpload = null;
        if (row.product_image_link) {
          try {
            imageValidation = await downloadAndValidateImage(row.product_image_link);
            if (imageValidation.valid) {
              summary.images_valid += 1;
              summary.images_uploaded_or_planned += 1;
            }
          } catch (error) {
            summary.errors.push({ product_row_number: row.product_sheet_row_number, excel_row_number: row.excel_row_number, product_name: row.product_name, stage: "image_validation", error: error.message });
          }
        }

        const ingredientItems = isDevice(row) ? parseSpecs(row.key_ingredients_specs) : parseMainIngredients(row.key_ingredients_specs);
        if (ingredientItems.length > 0) {
          summary.ingredients_specs_planned += 1;
        }
        summary.missing_products_insert_planned += 1;

        let insertedProduct = null;
        if (args.apply) {
          const insertPayload = buildInsertPayload(row, null, ingredientColumnCheck.ok);
          const { data: inserted, error: insertError } = await supabase
            .from("products")
            .insert(insertPayload)
            .select("id,name,brand,category,source_product_id,image_url,source_url,main_ingredients,key_specs,ingredient_verified,ingredient_review_status,review_status,created_at,updated_at")
            .single();
          if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
          insertedProduct = inserted;
          summary.inserted_products += 1;

          if (imageValidation?.valid) {
            imageUpload = await uploadImage(supabase, row, insertedProduct, imageValidation);
            const { error: imageUpdateError } = await supabase
              .from("products")
              .update({ image_url: imageUpload.publicUrl, updated_at: new Date().toISOString() })
              .eq("id", insertedProduct.id);
            if (imageUpdateError) throw new Error(`Inserted product image update failed: ${imageUpdateError.message}`);
          }
        }

        rowLogs.push({
          ...log,
          status: args.apply ? "inserted" : "insert_planned",
          product_id: insertedProduct?.id || "",
          image_valid: Boolean(imageValidation?.valid),
          image_action: args.apply ? "uploaded_if_valid" : "planned_if_valid",
          image_content_type: imageValidation?.contentType || "",
          image_file_size_kb: imageValidation?.fileSizeKb || "",
          ingredients_or_specs_count: ingredientItems.length,
          ingredients_action: ingredientItems.length === 0 ? "no_sheet_data" : ingredientColumnCheck.ok ? "planned" : "migration_missing",
        });
        continue;
      }

      if (matches.length !== 1) {
        summary.skipped_products += 1;
        const reason = matches.length === 0 ? "no_match" : "multiple_matches";
        skipped.push({ ...log, reason, matches_found: matches.length });
        rowLogs.push({ ...log, status: "skipped", reason, matches_found: matches.length });
        continue;
      }

      const product = matches[0];
      summary.matched_products += 1;
      matchedBackups.push(product);

      let imageValidation = null;
      let imageUpload = null;
      if (row.product_image_link) {
        try {
          imageValidation = await downloadAndValidateImage(row.product_image_link);
          if (imageValidation.valid) {
            summary.images_valid += 1;
            if (!shouldSkipExistingImage(product, args.overwrite)) {
              summary.images_uploaded_or_planned += 1;
              if (args.apply) {
                imageUpload = await uploadImage(supabase, row, product, imageValidation);
              }
            }
          }
        } catch (error) {
          summary.errors.push({ product_row_number: row.product_sheet_row_number, excel_row_number: row.excel_row_number, product_name: row.product_name, stage: "image_validation", error: error.message });
        }
      }

      const ingredientItems = isDevice(row) ? parseSpecs(row.key_ingredients_specs) : parseMainIngredients(row.key_ingredients_specs);
      if (ingredientItems.length > 0 && !shouldSkipExistingIngredients(product, row, args.overwrite, ingredientColumnCheck.ok)) {
        summary.ingredients_specs_planned += 1;
      }

      if (args.apply) {
        const payload = buildUpdatePayload(row, imageUpload, ingredientColumnCheck.ok, args.overwrite, product);
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw new Error(`Update failed: ${error.message}`);
        summary.updated_products += 1;
      }

      rowLogs.push({
        ...log,
        status: args.apply ? "updated" : "planned",
        product_id: product.id,
        match_strategy: matchStrategy,
        existing_category: product.category,
        sheet_category: row.category,
        image_valid: Boolean(imageValidation?.valid),
        image_action: shouldSkipExistingImage(product, args.overwrite) ? "skipped_existing_image" : args.apply ? "uploaded_if_valid" : "planned_if_valid",
        image_content_type: imageValidation?.contentType || "",
        image_file_size_kb: imageValidation?.fileSizeKb || "",
        ingredients_or_specs_count: ingredientItems.length,
        ingredients_action: ingredientItems.length === 0
          ? "no_sheet_data"
          : shouldSkipExistingIngredients(product, row, args.overwrite, ingredientColumnCheck.ok)
          ? "skipped_existing_verified"
          : ingredientColumnCheck.ok
            ? "planned"
            : "migration_missing",
      });
    } catch (error) {
      summary.skipped_products += 1;
      summary.errors.push({ product_row_number: row.product_sheet_row_number, excel_row_number: row.excel_row_number, product_name: row.product_name, stage: "row", error: error.message });
      skipped.push({ ...log, reason: "error", error: error.message });
      rowLogs.push({ ...log, status: "error", error: error.message });
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rangeLabel = args.rows.length > 0 ? `rows_${rows.map((row) => row.product_sheet_row_number).join("_")}` : `rows_${args.startRow}_to_${args.endRow}`;
  const logPath = path.join(LOG_DIR, `product_update_${rangeLabel}_${summary.mode}_${stamp}.json`);
  fs.writeFileSync(logPath, JSON.stringify({ summary, skipped, rows: rowLogs }, null, 2));

  if (args.apply) {
    const backupPath = path.join(BACKUP_DIR, `products_${rangeLabel}_update_backup_${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(matchedBackups, null, 2));
    summary.backup_json = backupPath;
  }
  summary.log_json = logPath;

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
