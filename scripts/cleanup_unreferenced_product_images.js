const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BUCKET = "product-images";

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

function storagePathFromPublicUrl(url) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = String(url || "").indexOf(marker);
  if (index < 0) return "";
  return decodeURIComponent(String(url).slice(index + marker.length));
}

async function listAllStorageObjects(supabase, prefix = "") {
  const all = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;
  for (const item of data || []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id || item.metadata) {
      all.push(fullPath);
    } else {
      all.push(...await listAllStorageObjects(supabase, fullPath));
    }
  }
  return all;
}

async function fetchReferencedImagePaths(supabase) {
  const referenced = new Set();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("image_url")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    for (const row of data || []) {
      const storagePath = storagePathFromPublicUrl(row.image_url);
      if (storagePath) referenced.add(storagePath);
    }
    if (!data || data.length < pageSize) break;
  }
  return referenced;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run") || !apply;
  const env = readEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [allObjects, referenced] = await Promise.all([
    listAllStorageObjects(supabase),
    fetchReferencedImagePaths(supabase),
  ]);
  const unreferenced = allObjects.filter((objectPath) => !referenced.has(objectPath));

  if (apply && unreferenced.length > 0) {
    for (let index = 0; index < unreferenced.length; index += 100) {
      const batch = unreferenced.slice(index, index + 100);
      const { error } = await supabase.storage.from(BUCKET).remove(batch);
      if (error) throw error;
    }
  }

  console.log(JSON.stringify({
    mode: dryRun ? "dry-run" : "apply",
    bucket: BUCKET,
    total_storage_objects: allObjects.length,
    referenced_by_products_image_url: referenced.size,
    unreferenced_objects: unreferenced.length,
    deleted_objects: apply ? unreferenced.length : 0,
    unreferenced_sample: unreferenced.slice(0, 50),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
