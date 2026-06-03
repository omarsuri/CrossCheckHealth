const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const ENV_FILE = path.join(PROJECT_ROOT, ".env.local");
const REVIEW_FILE = path.join(SCRIPT_DIR, "image_review_updated.xlsx");
const BUCKET = "product-images";

function readEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
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

function fileExtension(filePath, contentType) {
  const ext = path.extname(filePath).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(ext)) return ext;
  const type = safeString(contentType).toLowerCase();
  if (type.includes("png")) return ".png";
  if (type.includes("webp")) return ".webp";
  if (type.includes("avif")) return ".avif";
  if (type.includes("jpeg") || type.includes("jpg")) return ".jpg";
  return ".jpg";
}

function readReviewRows() {
  if (!fs.existsSync(REVIEW_FILE)) throw new Error(`Review workbook not found: ${REVIEW_FILE}`);
  const workbook = xlsx.readFile(REVIEW_FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet, { defval: "" });
}

async function findProductMatches(supabase, row) {
  let query = supabase.from("products").select("id,name,brand,image_url").eq("name", row.product_name);
  if (row.brand) query = query.eq("brand", row.brand);
  const { data, error } = await query;
  if (error) throw new Error(`Product lookup failed for ${row.product_name}: ${error.message}`);
  return data || [];
}

async function uploadApprovedRow(supabase, row) {
  const localPath = safeString(row.local_download_path);
  if (!localPath || !fs.existsSync(localPath)) {
    return {
      row_number: row.row_number,
      product_name: row.product_name,
      status: "skipped_missing_local_file",
      database_rows_updated: 0,
      notes: `Local file not found: ${localPath}`,
    };
  }

  const matches = await findProductMatches(supabase, row);
  if (!matches.length) {
    return {
      row_number: row.row_number,
      product_name: row.product_name,
      status: "skipped_product_not_found",
      database_rows_updated: 0,
      notes: "No products row matched exact name + brand",
    };
  }

  const contentType = safeString(row.content_type) || "image/jpeg";
  const ext = fileExtension(localPath, contentType);
  const storagePath = `${slugify(row.category || "uncategorized")}/${slugify(row.brand || "unknown")}/${String(row.row_number).padStart(3, "0")}-${slugify(row.product_name)}${ext}`;
  const buffer = fs.readFileSync(localPath);

  const upload = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (upload.error) throw new Error(`Storage upload failed for ${row.product_name}: ${upload.error.message}`);

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = publicUrlData.publicUrl;

  const productIds = matches.map((product) => product.id);
  const update = await supabase
    .from("products")
    .update({
      image_url: publicUrl,
      image_source_url: safeString(row.selected_image_url) || null,
      image_status: "uploaded_to_supabase",
      image_checked_at: new Date().toISOString(),
      image_verification_notes: `Approved upload from image_review_updated.xlsx row ${row.row_number}. Local file: ${path.basename(localPath)}.`,
    })
    .in("id", productIds)
    .select("id,name,image_url");

  if (update.error) throw new Error(`Product update failed for ${row.product_name}: ${update.error.message}`);

  return {
    row_number: row.row_number,
    product_name: row.product_name,
    status: "uploaded_and_updated",
    storage_path: storagePath,
    public_url: publicUrl,
    database_rows_updated: update.data?.length || 0,
    notes: matches.length > 1 ? `Updated ${matches.length} exact name/brand product matches` : "",
  };
}

async function main() {
  const env = { ...process.env, ...readEnv(ENV_FILE) };
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const rows = readReviewRows();
  const approvedRows = rows.filter((row) => safeString(row.reviewer_decision).toLowerCase() === "approve");
  const blockedRows = rows.filter((row) => {
    const decision = safeString(row.reviewer_decision).toLowerCase();
    return decision !== "approve";
  });

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results = [];
  for (let index = 0; index < approvedRows.length; index += 1) {
    const result = await uploadApprovedRow(supabase, approvedRows[index]);
    results.push(result);
    console.log(`${index + 1}/${approvedRows.length}. row ${result.row_number} ${result.product_name} => ${result.status}`);
  }

  const uploaded = results.filter((row) => row.status === "uploaded_and_updated");
  const failedOrSkipped = results.filter((row) => row.status !== "uploaded_and_updated");
  const databaseRowsUpdated = results.reduce((sum, row) => sum + Number(row.database_rows_updated || 0), 0);

  console.log("");
  console.log("Summary");
  console.log(`approved_rows=${approvedRows.length}`);
  console.log(`blank_replace_or_skip_rows_not_uploaded=${blockedRows.length}`);
  console.log(`uploaded_rows=${uploaded.length}`);
  console.log(`database_rows_updated=${databaseRowsUpdated}`);
  console.log(`failed_or_skipped_approved_rows=${failedOrSkipped.length}`);
  if (failedOrSkipped.length) {
    console.log(`failed_products=${failedOrSkipped.map((row) => `${row.product_name} (${row.status})`).join(" | ")}`);
  } else {
    console.log("failed_products=none");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
