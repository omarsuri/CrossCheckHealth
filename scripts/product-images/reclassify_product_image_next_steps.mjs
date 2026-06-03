import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const projectDir = path.resolve(".");
const workbookPath = path.join(projectDir, "product_image_next_steps.xlsx");

const blob = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(blob);
const sheet = workbook.worksheets.getItem("product_image_next_steps");
const usedRange = sheet.getUsedRange(true);
const values = usedRange.values ?? [];

if (values.length < 2) {
  throw new Error("product_image_next_steps sheet has no product rows.");
}

const headers = values[0].map((value) => String(value ?? "").trim());
const col = Object.fromEntries(headers.map((header, index) => [header, index]));
const required = [
  "source_url",
  "current_product_image_link",
  "image_link_type",
  "image_status",
  "automation_priority",
  "automation_action",
  "needs_manual_review",
  "reason",
  "recommended_next_step",
];

for (const header of required) {
  if (!(header in col)) throw new Error(`Missing expected column: ${header}`);
}

function parseUrl(value) {
  if (!value) return null;
  try {
    return new URL(String(value).trim());
  } catch {
    return null;
  }
}

function isSearchUrl(value) {
  const parsed = parseUrl(value);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase();
  const full = parsed.href.toLowerCase();
  return (
    host.includes("google.") ||
    host.includes("bing.") ||
    host.includes("duckduckgo.") ||
    host.includes("yahoo.") ||
    full.includes("/search?") ||
    full.includes("tbm=isch") ||
    full.includes("images/search")
  );
}

function isDirectImageUrl(value) {
  const parsed = parseUrl(value);
  if (!parsed || isSearchUrl(value)) return false;
  const full = parsed.href.toLowerCase();
  const hostPath = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  if (/\.(jpe?g|png|webp)(?:[?#].*)?$/i.test(full)) return true;
  return (
    (hostPath.includes("cdn") ||
      hostPath.includes("static") ||
      hostPath.includes("media") ||
      hostPath.includes("assets") ||
      hostPath.includes("images") ||
      hostPath.includes("wp-content/uploads")) &&
    (hostPath.includes("image") || hostPath.includes("product") || hostPath.includes("upload"))
  );
}

function isRealProductPage(value) {
  const parsed = parseUrl(value);
  if (!parsed || isSearchUrl(value)) return false;
  if (!["http:", "https:"].includes(parsed.protocol)) return false;

  const pathname = parsed.pathname.replace(/\/+$/g, "").toLowerCase();
  const pathParts = pathname.split("/").filter(Boolean);
  if (pathParts.length === 0) return false;

  const categoryOnlyPatterns = [
    /^\/?(collections?|categories?|category|shop|store|catalog|products?|brands?|search)\/?$/,
    /\/(collections?|categories?|category|shop|catalog|search)\/?$/,
    /\/blood-pressure-monitors$/,
    /\/glucometers$/,
    /\/health-devices$/,
  ];
  if (categoryOnlyPatterns.some((pattern) => pattern.test(pathname))) return false;

  const productSignals = [
    /\/products?\//,
    /\/product\//,
    /\/p\//,
    /\/pd\//,
    /\/item\//,
    /\/dp\//,
    /\/buy\//,
    /\/medicine\//,
    /\/nutrition\//,
    /\/[^/]+-\d+$/,
    /\/[^/]+\.html$/,
  ];
  if (productSignals.some((pattern) => pattern.test(pathname))) return true;

  return pathParts.length >= 2 && /[a-z0-9]/i.test(pathParts.at(-1));
}

function imageLinkType(value) {
  if (!String(value ?? "").trim()) return "missing";
  if (isDirectImageUrl(value)) return "direct_image_url";
  if (isSearchUrl(value)) return "search_result_url";
  if (parseUrl(value)) return "non_direct_web_url";
  return "unclear_or_invalid";
}

const rows = values.slice(1).map((row) => [...row]);
const counts = {};

for (const row of rows) {
  const sourceUrl = String(row[col.source_url] ?? "").trim();
  const imageLink = String(row[col.current_product_image_link] ?? "").trim();
  const type = imageLinkType(imageLink);
  const directImage = type === "direct_image_url";
  const sourceReady = isRealProductPage(sourceUrl);

  row[col.image_link_type] = type;

  if (directImage) {
    row[col.image_status] = "usable_direct_image";
    row[col.automation_priority] = "high";
    row[col.automation_action] = "download_upload_direct_image_first";
    row[col.needs_manual_review] = "no";
    row[col.reason] = "Direct image URL appears usable";
    row[col.recommended_next_step] = sourceReady
      ? "Prefer direct image URL, then verify against source_url"
      : "Download image, upload to Supabase Storage bucket product-images, update products.image_url";
  } else if (sourceReady) {
    row[col.image_status] = "source_url_ready";
    row[col.automation_priority] = "high";
    row[col.automation_action] = "extract_from_source_url";
    row[col.needs_manual_review] = "no";
    row[col.reason] = "source_url appears to be a real product page";
    row[col.recommended_next_step] =
      "Run image worker on source_url to extract og:image, JSON-LD image, or main product image";
  } else if (type === "search_result_url") {
    row[col.image_status] = "search_link_not_usable";
    row[col.automation_priority] = "low";
    row[col.automation_action] = "ignore_image_link_use_source_url";
    row[col.needs_manual_review] = "yes";
    row[col.reason] = "Search result links are not stable direct image files";
    row[col.recommended_next_step] =
      "Use source_url to extract og:image or manually replace with official product page image";
  } else {
    row[col.image_status] = "missing_source_url";
    row[col.automation_priority] = "low";
    row[col.automation_action] = "manual_find_official_product_page";
    row[col.needs_manual_review] = "yes";
    row[col.reason] = "No reliable product page available for automated image extraction";
    row[col.recommended_next_step] = "Manually find official product page or retailer product page";
  }

  counts[row[col.image_status]] = (counts[row[col.image_status]] ?? 0) + 1;
}

sheet.getRangeByIndexes(1, 0, rows.length, headers.length).values = rows;

const manualReviewCount = rows.filter((row) => row[col.needs_manual_review] === "yes").length;
const highPriorityCount = rows.filter((row) => row[col.automation_priority] === "high").length;
const lowPriorityCount = rows.filter((row) => row[col.automation_priority] === "low").length;

const summary = workbook.worksheets.getItem("summary");
const summaryRows = [
  ["metric", "value"],
  ["total_products", rows.length],
  ["count_usable_direct_image", counts.usable_direct_image ?? 0],
  ["count_search_link_not_usable", counts.search_link_not_usable ?? 0],
  ["count_missing_source_url", counts.missing_source_url ?? 0],
  ["count_needs_manual_review", manualReviewCount],
  ["count_high_priority", highPriorityCount],
  ["count_low_priority", lowPriorityCount],
  [
    "recommended_batch_order",
    "1. Process direct image URLs first\n2. Process products with strong source_url next\n3. Add category placeholders for remaining products\n4. Manually review missing/unclear source URLs",
  ],
];
summary.getRangeByIndexes(0, 0, summaryRows.length, 2).values = summaryRows;

const output = await SpreadsheetFile.exportXlsx(workbook);
const tempPath = path.join(projectDir, "product_image_next_steps.updated.tmp.xlsx");
await output.save(tempPath);
await fs.copyFile(tempPath, workbookPath);
await fs.unlink(tempPath);

console.log(
  JSON.stringify(
    {
      workbookPath,
      totalProducts: rows.length,
      counts,
      manualReviewCount,
      highPriorityCount,
      lowPriorityCount,
    },
    null,
    2,
  ),
);
