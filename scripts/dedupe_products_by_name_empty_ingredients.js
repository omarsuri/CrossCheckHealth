const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BACKUP_DIR = path.join(PROJECT_ROOT, "backups");
const LOG_DIR = path.join(PROJECT_ROOT, "scripts", "logs");

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

function hasMainIngredients(product) {
  return Array.isArray(product.main_ingredients) && product.main_ingredients.length > 0;
}

function scoreKeepCandidate(product) {
  let score = 0;
  if (hasMainIngredients(product)) score += 1000;
  if (product.image_url) score += 100;
  if (product.source_url) score += 50;
  if (product.source_product_id) score += 25;
  if (product.ingredient_verified) score += 20;
  if (product.review_status) score += 10;
  if (product.updated_at) score += new Date(product.updated_at).getTime() / 1e13;
  return score;
}

function chooseKeepProduct(products) {
  return [...products].sort((a, b) => scoreKeepCandidate(b) - scoreKeepCandidate(a))[0];
}

async function fetchAllProducts(supabase) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,brand,category,source_product_id,image_url,source_url,main_ingredients,ingredient_verified,ingredient_review_status,review_status,created_at,updated_at")
      .range(from, from + pageSize - 1)
      .order("name", { ascending: true });
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run") || !apply;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const env = readEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const products = await fetchAllProducts(supabase);
  const groups = new Map();
  for (const product of products) {
    const name = String(product.name || "").trim();
    if (!name) continue;
    const group = groups.get(name) || [];
    group.push(product);
    groups.set(name, group);
  }

  const duplicateGroups = [...groups.entries()].filter(([, group]) => group.length > 1);
  const deletePlan = [];
  const keepPlan = [];

  for (const [name, group] of duplicateGroups) {
    const keep = chooseKeepProduct(group);
    const deletable = group.filter((product) => product.id !== keep.id && !hasMainIngredients(product));
    keepPlan.push({
      name,
      keep_id: keep.id,
      keep_brand: keep.brand,
      keep_has_main_ingredients: hasMainIngredients(keep),
      duplicate_count: group.length,
      delete_count: deletable.length,
      preserved_non_empty_duplicates: group.filter((product) => product.id !== keep.id && hasMainIngredients(product)).map((product) => product.id),
    });
    for (const product of deletable) {
      deletePlan.push({
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        image_url: product.image_url,
        main_ingredients: product.main_ingredients,
        keep_id: keep.id,
        reason: "duplicate_name_empty_main_ingredients",
      });
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUP_DIR, `duplicate_products_empty_ingredients_backup_${stamp}.json`);
  const logPath = path.join(LOG_DIR, `dedupe_products_by_name_empty_ingredients_${dryRun ? "dry-run" : "apply"}_${stamp}.json`);

  if (apply && deletePlan.length > 0) {
    fs.writeFileSync(backupPath, JSON.stringify(deletePlan, null, 2));
    for (let index = 0; index < deletePlan.length; index += 100) {
      const ids = deletePlan.slice(index, index + 100).map((product) => product.id);
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
    }
  }

  const summary = {
    mode: dryRun ? "dry-run" : "apply",
    total_products_scanned: products.length,
    duplicate_name_groups: duplicateGroups.length,
    products_planned_for_delete: deletePlan.length,
    products_deleted: apply ? deletePlan.length : 0,
    groups_where_all_main_ingredients_empty: keepPlan.filter((group) => !group.keep_has_main_ingredients).length,
    groups_with_non_empty_ingredient_product_kept: keepPlan.filter((group) => group.keep_has_main_ingredients).length,
    backup_json: apply ? backupPath : "",
    log_json: logPath,
  };

  fs.writeFileSync(logPath, JSON.stringify({ summary, keepPlan, deletePlan }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
