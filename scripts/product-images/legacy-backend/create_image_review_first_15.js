const path = require("path");
const xlsx = require("xlsx");

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const INPUT_FILE = path.join(SCRIPT_DIR, "image_pipeline_test_results.xlsx");
const PLANNING_FILE = path.join(PROJECT_ROOT, "product_image_next_steps.xlsx");
const OUTPUT_FILE = path.join(SCRIPT_DIR, "image_review_first_15.xlsx");

const SMALL_FILE_KB_THRESHOLD = 10;
const QUALITY_URL_WORDS = [
  "logo",
  "banner",
  "icon",
  "placeholder",
  "small",
  "thumbnail",
  "thumb",
  "sprite",
  "pixel",
  "tracking",
];

function safeString(value) {
  return String(value ?? "").trim();
}

function readRows(filePath, sheetName) {
  const workbook = xlsx.readFile(filePath);
  const sheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`Sheet not found: ${sheetName || workbook.SheetNames[0]}`);
  return xlsx.utils.sheet_to_json(sheet, { defval: "" });
}

function normalizeName(value) {
  return safeString(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function possibleUrlIssue(url) {
  const lower = safeString(url).toLowerCase();
  return QUALITY_URL_WORDS.filter((word) => lower.includes(word));
}

function buildNotes({ isDuplicate, isSmall, urlIssueWords, sourceRow }) {
  const notes = [];
  if (isDuplicate) {
    notes.push("Selected image URL is shared with another product; verify it is not a reused/generic image.");
  }
  if (isSmall) {
    notes.push(`Downloaded file is below ${SMALL_FILE_KB_THRESHOLD} KB; inspect for tiny product image or low-resolution asset.`);
  }
  if (urlIssueWords.length) {
    notes.push(`Image URL contains quality-risk words: ${urlIssueWords.join(", ")}.`);
  }
  if (safeString(sourceRow.status) !== "success") {
    notes.push("Pipeline status was not success; choose a replacement before upload.");
  }
  if (!safeString(sourceRow.selected_image_url)) {
    notes.push("No selected image URL; manually find a product image.");
  }
  if (!notes.length) {
    notes.push("Review visual match, crop, product variant, and image clarity before approving upload.");
  }
  return notes.join(" ");
}

const testRows = readRows(INPUT_FILE).slice(0, 15);
const planningRows = readRows(PLANNING_FILE, "product_image_next_steps");
const planningByName = new Map(planningRows.map((row) => [normalizeName(row.product_name), row]));
const urlCounts = new Map();

for (const row of testRows) {
  const url = safeString(row.selected_image_url);
  if (url) urlCounts.set(url, (urlCounts.get(url) || 0) + 1);
}

const reviewRows = testRows.map((row) => {
  const planningRow = planningByName.get(normalizeName(row.product_name)) || {};
  const selectedUrl = safeString(row.selected_image_url);
  const fileSizeKb = Number(row.file_size_kb || 0);
  const isDuplicate = selectedUrl && (urlCounts.get(selectedUrl) || 0) > 1;
  const isSmall = fileSizeKb > 0 && fileSizeKb < SMALL_FILE_KB_THRESHOLD;
  const urlIssueWords = possibleUrlIssue(selectedUrl);
  const hasIssue = isDuplicate || isSmall || urlIssueWords.length > 0 || safeString(row.status) !== "success";

  return {
    product_name: safeString(row.product_name),
    brand: safeString(planningRow.brand),
    category: safeString(planningRow.category),
    source_url: safeString(row.source_url),
    selected_image_url: selectedUrl,
    selected_reason: safeString(row.selected_reason),
    file_size_kb: row.file_size_kb,
    content_type: safeString(row.content_type),
    local_download_path: safeString(row.saved_file),
    possible_quality_issue: hasIssue ? "yes" : "no",
    reviewer_decision: "",
    final_action: "",
    notes: buildNotes({ isDuplicate, isSmall, urlIssueWords, sourceRow: row }),
  };
});

const workbook = xlsx.utils.book_new();
const worksheet = xlsx.utils.json_to_sheet(reviewRows, {
  header: [
    "product_name",
    "brand",
    "category",
    "source_url",
    "selected_image_url",
    "selected_reason",
    "file_size_kb",
    "content_type",
    "local_download_path",
    "possible_quality_issue",
    "reviewer_decision",
    "final_action",
    "notes",
  ],
});

worksheet["!cols"] = [
  { wch: 42 },
  { wch: 18 },
  { wch: 18 },
  { wch: 58 },
  { wch: 72 },
  { wch: 58 },
  { wch: 12 },
  { wch: 16 },
  { wch: 72 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 74 },
];

xlsx.utils.book_append_sheet(workbook, worksheet, "image_review_first_15");
xlsx.writeFile(workbook, OUTPUT_FILE);

const duplicateUrlCount = [...urlCounts.values()].filter((count) => count > 1).length;
const duplicateProductCount = reviewRows.filter((row) => {
  const url = safeString(row.selected_image_url);
  return url && (urlCounts.get(url) || 0) > 1;
}).length;
const smallImages = reviewRows.filter((row) => Number(row.file_size_kb || 0) < SMALL_FILE_KB_THRESHOLD);
const needingReplacement = reviewRows.filter((row) => row.possible_quality_issue === "yes");
const ready = reviewRows.filter((row) => row.possible_quality_issue === "no");

console.log(
  JSON.stringify(
    {
      output_file: OUTPUT_FILE,
      products_reviewed: reviewRows.length,
      duplicate_image_urls_found: duplicateUrlCount,
      products_with_duplicate_image_url: duplicateProductCount,
      small_images_found: smallImages.length,
      products_ready_for_upload: ready.length,
      products_needing_manual_image_replacement: needingReplacement.length,
      duplicate_products: reviewRows
        .filter((row) => {
          const url = safeString(row.selected_image_url);
          return url && (urlCounts.get(url) || 0) > 1;
        })
        .map((row) => row.product_name),
      small_image_products: smallImages.map((row) => row.product_name),
      manual_replacement_products: needingReplacement.map((row) => row.product_name),
    },
    null,
    2,
  ),
);
