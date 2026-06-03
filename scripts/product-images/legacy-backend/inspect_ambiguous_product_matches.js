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
  const rows = xlsx
    .utils
    .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" })
    .filter((row) =>
      [
        "Accu-Chek Instant Blood Glucose Meter",
        "Accu-Chek Instant S Blood Glucose Meter",
        "Accu-Chek Active Blood Glucose Meter",
        "Omron HEM-7120 Blood Pressure Monitor",
      ].includes(row.product_name),
    );

  for (const row of rows) {
    let query = supabase
      .from("products")
      .select("id,name,brand,source_url,image_url")
      .eq("name", row.product_name);
    if (row.brand) query = query.eq("brand", row.brand);
    const { data, error } = await query;
    if (error) throw error;
    console.log("");
    console.log(`${row.product_name} | review_source_url=${row.source_url} | matches=${data.length}`);
    for (const product of data) {
      console.log(JSON.stringify(product));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
