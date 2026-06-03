const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUTPUT = path.join(PROJECT_ROOT, "products_needing_ingredients.json");

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

function argValue(name, fallback) {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1) : fallback;
}

async function main() {
  const env = readEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const outputPath = path.resolve(PROJECT_ROOT, argValue("--out", DEFAULT_OUTPUT));
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const selectColumns = [
    "id",
    "name",
    "brand",
    "category",
    "subcategory",
    "form",
    "source_name",
    "source_url",
    "image_search_url",
    "ingredient_research",
    "main_ingredients",
    "ingredient_review_status",
  ].join(",");

  const requiredColumns = [
    "main_ingredients",
    "ingredient_review_status",
  ];
  const { data: columnCheck, error: columnCheckError } = await supabase
    .from("products")
    .select(requiredColumns.join(","))
    .limit(1);

  if (columnCheckError) {
    const message = columnCheckError.message || "";
    if (message.includes("main_ingredients") || message.includes("ingredient_review_status")) {
      throw new Error(
        [
          "Ingredient migration has not been applied to Supabase yet.",
          "Run this SQL first:",
          "supabase/migrations/202606030001_product_main_ingredients.sql",
          "Then rerun this export script.",
        ].join(" "),
      );
    }
    throw new Error(`Column check failed: ${columnCheckError.message}`);
  }
  void columnCheck;

  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select(selectColumns)
      .eq("ingredient_review_status", "needs_review")
      .not("category", "eq", "Device")
      .range(from, from + pageSize - 1)
      .order("name", { ascending: true });

    if (error) throw new Error(`Export query failed: ${error.message}`);
    rows.push(
      ...(data || []).filter((product) => {
        const ingredients = product.main_ingredients;
        return !Array.isArray(ingredients) || ingredients.length === 0;
      }),
    );
    if (!data || data.length < pageSize) break;
  }

  const exportRows = rows.map(({ ingredient_review_status, ...row }) => row);
  fs.writeFileSync(outputPath, JSON.stringify(exportRows, null, 2));
  console.log(`Exported ${exportRows.length} products to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
