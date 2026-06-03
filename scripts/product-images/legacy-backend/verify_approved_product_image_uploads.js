const fs = require("fs");
const xlsx = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

function readEnv() {
  const env = {};
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index > 0) env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function main() {
  const env = readEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const workbook = xlsx.readFile("backend/scripts/image_review_first_15.xlsx");
  const approved = xlsx
    .utils
    .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" })
    .filter((row) => String(row.reviewer_decision || "").trim().toLowerCase() === "approve");

  let matchedRows = 0;
  let rowsWithProductImagesUrl = 0;
  const missing = [];
  for (const row of approved) {
    let query = supabase.from("products").select("id,name,brand,image_url").eq("name", row.product_name);
    if (row.brand) query = query.eq("brand", row.brand);
    const { data, error } = await query;
    if (error) throw error;
    matchedRows += data.length;
    const goodRows = data.filter((product) =>
      String(product.image_url || "").includes("/storage/v1/object/public/product-images/"),
    );
    rowsWithProductImagesUrl += goodRows.length;
    if (!data.length || goodRows.length !== data.length) missing.push(row.product_name);
  }

  console.log(JSON.stringify({
    approved_rows: approved.length,
    matched_product_records: matchedRows,
    product_records_with_product_images_url: rowsWithProductImagesUrl,
    missing_or_not_updated_products: missing,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
