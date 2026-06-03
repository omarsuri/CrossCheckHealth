const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const PROJECT_ROOT = path.resolve(__dirname, "..");

function readEnv() {
  const envPath = path.join(PROJECT_ROOT, ".env.local");
  const env = { ...process.env };
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

function argValue(name) {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1) : "";
}

function parseMaybeJson(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function readInput(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".json") {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(parsed) ? parsed : parsed.items || parsed.products || [];
  }
  if (ext === ".csv" || ext === ".xlsx" || ext === ".xls") {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return xlsx.utils.sheet_to_json(sheet, { defval: "" }).map((row) => ({
      ...row,
      main_ingredients: parseMaybeJson(row.main_ingredients),
      ingredient_verified:
        typeof row.ingredient_verified === "boolean"
          ? row.ingredient_verified
          : String(row.ingredient_verified || "").trim().toLowerCase() === "true",
    }));
  }
  throw new Error("Input must be .json, .csv, .xlsx, or .xls");
}

function cleanIngredient(ingredient) {
  if (!ingredient || typeof ingredient !== "object") return null;
  const cleaned = {};
  for (const [key, value] of Object.entries(ingredient)) {
    if (value === undefined || value === null) continue;
    const text = typeof value === "string" ? value.trim() : value;
    if (text === "") continue;
    cleaned[key] = text;
  }
  return cleaned.name ? cleaned : null;
}

function validIngredients(value) {
  if (!Array.isArray(value)) return [];
  return value.map(cleanIngredient).filter(Boolean);
}

async function main() {
  const inputArg = argValue("--file") || process.argv[2];
  if (!inputArg) {
    throw new Error("Usage: node scripts/import_product_ingredients.js --file=verified_ingredients.json [--overwrite]");
  }
  const inputPath = path.resolve(PROJECT_ROOT, inputArg);
  const overwrite = process.argv.includes("--overwrite");
  const rows = readInput(inputPath);

  const env = readEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const counts = {
    input: rows.length,
    updated: 0,
    skipped_empty_ingredients: 0,
    skipped_missing_id: 0,
    skipped_not_found: 0,
    skipped_existing_verified: 0,
    failed: 0,
  };
  const failures = [];

  for (const row of rows) {
    const id = String(row.id || "").trim();
    if (!id) {
      counts.skipped_missing_id += 1;
      continue;
    }

    const ingredients = validIngredients(row.main_ingredients);
    if (!ingredients.length) {
      counts.skipped_empty_ingredients += 1;
      continue;
    }

    const { data: existing, error: lookupError } = await supabase
      .from("products")
      .select("id,ingredient_verified,main_ingredients")
      .eq("id", id)
      .single();

    if (lookupError || !existing) {
      counts.skipped_not_found += 1;
      failures.push({ id, reason: lookupError?.message || "Product not found" });
      continue;
    }

    if (!overwrite && existing.ingredient_verified && Array.isArray(existing.main_ingredients) && existing.main_ingredients.length > 0) {
      counts.skipped_existing_verified += 1;
      continue;
    }

    const now = new Date().toISOString();
    const payload = {
      main_ingredients: ingredients,
      ingredient_source_name: row.ingredient_source_name || null,
      ingredient_source_url: row.ingredient_source_url || null,
      ingredient_review_status: row.ingredient_review_status || "verified_official_source",
      ingredient_verified: Boolean(row.ingredient_verified ?? true),
      ingredient_checked_at: now,
      updated_at: now,
    };

    const { error: updateError } = await supabase.from("products").update(payload).eq("id", id);
    if (updateError) {
      counts.failed += 1;
      failures.push({ id, reason: updateError.message });
      continue;
    }
    counts.updated += 1;
  }

  console.log(JSON.stringify({ ...counts, failures }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
