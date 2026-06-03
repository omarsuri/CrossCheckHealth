import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const projectDir = path.resolve(".");
const inputPath = path.join(projectDir, "indian_health_products_with_image_links_pass1.xlsx");
const outputPath = path.join(projectDir, "product_image_next_steps.xlsx");

const input = await FileBlob.load(inputPath);
const sourceWorkbook = await SpreadsheetFile.importXlsx(input);
const sourceSheet = sourceWorkbook.worksheets.getItemAt(0);
const usedRange = sourceSheet.getUsedRange(true);
const values = usedRange.values ?? [];

if (!values.length) {
  throw new Error("Source workbook appears to be empty.");
}

const rawHeaders = values[0].map((value) => String(value ?? "").trim());
const rows = values.slice(1);

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function findColumn(candidates) {
  const normalizedHeaders = rawHeaders.map(normalize);
  for (const candidate of candidates.map(normalize)) {
    const exactIndex = normalizedHeaders.findIndex((header) => header === candidate);
    if (exactIndex >= 0) return exactIndex;
  }
  for (const candidate of candidates.map(normalize)) {
    const partialIndex = normalizedHeaders.findIndex(
      (header) => header.includes(candidate) || candidate.includes(header),
    );
    if (partialIndex >= 0) return partialIndex;
  }
  return -1;
}

const columnIndexes = {
  productName: findColumn(["product_name", "product name", "name", "product"]),
  brand: findColumn(["brand", "brand name", "manufacturer"]),
  category: findColumn(["category", "product category", "type"]),
  sourceUrl: findColumn(["source_url", "source url", "source", "product url", "url"]),
  productImageLink: findColumn([
    "product image link",
    "product_image_link",
    "image link",
    "image url",
    "product image url",
  ]),
};

for (const [key, index] of Object.entries(columnIndexes)) {
  if (index < 0) {
    throw new Error(`Could not infer required source column: ${key}. Headers: ${rawHeaders.join(", ")}`);
  }
}

const directImageExtensions = /\.(jpe?g|png|webp)(?:[?#].*)?$/i;
const cdnImageSignals = [
  "cdn",
  "cloudfront",
  "images.",
  "image.",
  "static.",
  "media.",
  "assets.",
  "img.",
  "shopify",
  "wp-content/uploads",
];
const searchDomains = [
  "google.",
  "bing.",
  "duckduckgo.",
  "yahoo.",
  "yandex.",
  "search.brave.",
];
const homepagePathFragments = ["", "/", "/home", "/index.html", "/index.php"];

function getCell(row, index) {
  return String(row[index] ?? "").trim();
}

function parseUrl(value) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isSearchLink(value) {
  const lower = value.toLowerCase();
  const parsed = parseUrl(value);
  if (!parsed) return /(^|\s)(google|bing|image search|search results)(\s|$)/i.test(value);
  const host = parsed.hostname.toLowerCase();
  if (searchDomains.some((domain) => host.includes(domain))) return true;
  if (lower.includes("/search?") || lower.includes("tbm=isch") || lower.includes("udm=2")) return true;
  if (lower.includes("images/search") || lower.includes("image-search")) return true;
  return false;
}

function isDirectImageLink(value) {
  const parsed = parseUrl(value);
  if (!parsed) return false;
  if (isSearchLink(value)) return false;
  const lower = value.toLowerCase();
  if (directImageExtensions.test(lower)) return true;
  const hostAndPath = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  if (hostAndPath.includes("image") && cdnImageSignals.some((signal) => hostAndPath.includes(signal))) return true;
  if (lower.includes("/cdn/") && lower.includes("product")) return true;
  return false;
}

function imageLinkType(value) {
  if (!value) return "missing";
  if (isDirectImageLink(value)) return "direct_image_url";
  if (isSearchLink(value)) return "search_result_url";
  const parsed = parseUrl(value);
  if (parsed) return "non_direct_web_url";
  return "unclear_or_invalid";
}

function sourceUrlStrength(value) {
  const parsed = parseUrl(value);
  if (!parsed) return "missing_or_invalid";
  const pathName = parsed.pathname.replace(/\/+$/g, "").toLowerCase();
  if (homepagePathFragments.includes(pathName || "/")) return "homepage_only";
  const lower = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  if (/(category|collections|collection|shop|search|catalog|brand\/?$|brands\/?$|products\/?$)/i.test(pathName)) {
    return "category_or_unclear";
  }
  if (/(product|products|p\/|pd\/|item|buy|sku|dp\/|medicine|nutrition|health|wellness)/i.test(lower)) {
    return "strong_product_page";
  }
  if (pathName.split("/").filter(Boolean).length >= 2) return "likely_product_page";
  return "category_or_unclear";
}

function classify(row) {
  const productName = getCell(row, columnIndexes.productName);
  const brand = getCell(row, columnIndexes.brand);
  const category = getCell(row, columnIndexes.category);
  const sourceUrl = getCell(row, columnIndexes.sourceUrl);
  const imageLink = getCell(row, columnIndexes.productImageLink);
  const type = imageLinkType(imageLink);
  const sourceStrength = sourceUrlStrength(sourceUrl);
  const hasStrongSource = ["strong_product_page", "likely_product_page"].includes(sourceStrength);

  let imageStatus;
  let automationPriority;
  let automationAction;
  let needsManualReview;
  let reason;
  let recommendedNextStep;

  if (!hasStrongSource && sourceStrength !== "homepage_only" && sourceStrength !== "category_or_unclear" && sourceStrength !== "missing_or_invalid") {
    throw new Error(`Unexpected source strength: ${sourceStrength}`);
  }

  if (type === "direct_image_url") {
    imageStatus = "usable_direct_image";
    automationPriority = "high";
    automationAction = sourceUrl ? "download_upload_direct_image_first" : "download_upload_to_supabase";
    needsManualReview = "no";
    reason = "Direct image URL appears usable";
    recommendedNextStep = sourceUrl
      ? "Prefer direct image URL, then verify against source_url"
      : "Download image, upload to Supabase Storage bucket product-images, update products.image_url";
  } else if (!hasStrongSource) {
    imageStatus = "missing_source_url";
    automationPriority = "low";
    automationAction = "manual_find_official_product_page";
    needsManualReview = "yes";
    reason = "No reliable product page available for automated image extraction";
    recommendedNextStep = "Manually find official product page or retailer product page";
  } else if (type === "search_result_url") {
    imageStatus = "search_link_not_usable";
    automationPriority = "low";
    automationAction = "ignore_image_link_use_source_url";
    needsManualReview = "yes";
    reason = "Search result links are not stable direct image files";
    recommendedNextStep =
      "Run image worker on source_url to extract og:image, JSON-LD image, or main product image";
  } else {
    imageStatus = "source_url_ready";
    automationPriority = "high";
    automationAction = "run_image_worker_on_source_url";
    needsManualReview = "no";
    reason = "Product page source_url appears suitable for automated image extraction";
    recommendedNextStep =
      "Run image worker on source_url to extract og:image, JSON-LD image, or main product image";
  }

  return [
    productName,
    brand,
    category,
    sourceUrl,
    imageLink,
    type,
    imageStatus,
    automationPriority,
    automationAction,
    needsManualReview,
    reason,
    recommendedNextStep,
  ];
}

const outputHeaders = [
  "product_name",
  "brand",
  "category",
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

const classifiedRows = rows.map(classify);
const statusCounts = classifiedRows.reduce((counts, row) => {
  counts[row[6]] = (counts[row[6]] ?? 0) + 1;
  return counts;
}, {});
const manualReviewCount = classifiedRows.filter((row) => row[9] === "yes").length;
const highPriorityCount = classifiedRows.filter((row) => row[7] === "high").length;
const lowPriorityCount = classifiedRows.filter((row) => row[7] === "low").length;

const summaryRows = [
  ["metric", "value"],
  ["total_products", classifiedRows.length],
  ["count_usable_direct_image", statusCounts.usable_direct_image ?? 0],
  ["count_search_link_not_usable", statusCounts.search_link_not_usable ?? 0],
  ["count_missing_source_url", statusCounts.missing_source_url ?? 0],
  ["count_needs_manual_review", manualReviewCount],
  ["count_high_priority", highPriorityCount],
  ["count_low_priority", lowPriorityCount],
  [
    "recommended_batch_order",
    "1. Process direct image URLs first\n2. Process products with strong source_url next\n3. Add category placeholders for remaining products\n4. Manually review missing/unclear source URLs",
  ],
];

const workbook = Workbook.create();
const planningSheet = workbook.worksheets.add("product_image_next_steps");
const summarySheet = workbook.worksheets.add("summary");

planningSheet.getRangeByIndexes(0, 0, classifiedRows.length + 1, outputHeaders.length).values = [
  outputHeaders,
  ...classifiedRows,
];
summarySheet.getRangeByIndexes(0, 0, summaryRows.length, 2).values = summaryRows;

planningSheet.tables.add(
  `A1:L${classifiedRows.length + 1}`,
  true,
  "ProductImageNextStepsTable",
);
summarySheet.tables.add(`A1:B${summaryRows.length}`, true, "SummaryTable");

planningSheet.freezePanes.freezeRows(1);
summarySheet.freezePanes.freezeRows(1);
planningSheet.showGridLines = false;
summarySheet.showGridLines = false;

planningSheet.getRange("A1:L1").format = {
  fill: "#17324D",
  font: { bold: true, color: "#FFFFFF" },
};
summarySheet.getRange("A1:B1").format = {
  fill: "#17324D",
  font: { bold: true, color: "#FFFFFF" },
};

planningSheet.getRange(`A2:L${classifiedRows.length + 1}`).format = {
  wrapText: true,
  font: { color: "#1F2937" },
};
summarySheet.getRange(`A2:B${summaryRows.length}`).format = {
  wrapText: true,
  font: { color: "#1F2937" },
};

const widths = [260, 140, 150, 320, 340, 160, 180, 155, 235, 150, 300, 420];
widths.forEach((width, index) => {
  planningSheet.getRangeByIndexes(0, index, classifiedRows.length + 1, 1).format.columnWidthPx = width;
});
summarySheet.getRange("A:A").format.columnWidthPx = 250;
summarySheet.getRange("B:B").format.columnWidthPx = 560;
planningSheet.getRange(`A1:L${classifiedRows.length + 1}`).format.rowHeightPx = 42;
summarySheet.getRange(`A1:B${summaryRows.length}`).format.rowHeightPx = 44;

planningSheet.getRange(`G2:G${classifiedRows.length + 1}`).conditionalFormats.add("containsText", {
  text: "usable_direct_image",
  format: { fill: "#DCFCE7", font: { color: "#166534", bold: true } },
});
planningSheet.getRange(`G2:G${classifiedRows.length + 1}`).conditionalFormats.add("containsText", {
  text: "search_link_not_usable",
  format: { fill: "#FEF3C7", font: { color: "#92400E", bold: true } },
});
planningSheet.getRange(`G2:G${classifiedRows.length + 1}`).conditionalFormats.add("containsText", {
  text: "missing_source_url",
  format: { fill: "#FEE2E2", font: { color: "#991B1B", bold: true } },
});
planningSheet.getRange(`G2:G${classifiedRows.length + 1}`).conditionalFormats.add("containsText", {
  text: "source_url_ready",
  format: { fill: "#DBEAFE", font: { color: "#1E40AF", bold: true } },
});

const planningPreview = await workbook.render({
  sheetName: "product_image_next_steps",
  range: "A1:L20",
  scale: 1,
  format: "png",
});
const summaryPreview = await workbook.render({
  sheetName: "summary",
  autoCrop: "all",
  scale: 1,
  format: "png",
});
await fs.writeFile(
  path.join(projectDir, "product_image_next_steps_preview.png"),
  new Uint8Array(await planningPreview.arrayBuffer()),
);
await fs.writeFile(
  path.join(projectDir, "product_image_next_steps_summary_preview.png"),
  new Uint8Array(await summaryPreview.arrayBuffer()),
);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(
  JSON.stringify(
    {
      outputPath,
      totalProducts: classifiedRows.length,
      statusCounts,
      manualReviewCount,
      highPriorityCount,
      lowPriorityCount,
      inferredColumns: Object.fromEntries(
        Object.entries(columnIndexes).map(([key, index]) => [key, rawHeaders[index]]),
      ),
    },
    null,
    2,
  ),
);
