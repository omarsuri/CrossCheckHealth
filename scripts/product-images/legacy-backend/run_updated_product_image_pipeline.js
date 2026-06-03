const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const axios = require("axios");
const cheerio = require("cheerio");

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const INPUT_FILE = path.join(PROJECT_ROOT, "product_image_next_steps.xlsx");
const RECLASSIFIED_FILE = path.join(PROJECT_ROOT, "product_image_next_steps_reclassified.xlsx");
const TEST_RESULTS_FILE = path.join(SCRIPT_DIR, "image_pipeline_test_results_updated.xlsx");
const REVIEW_FILE = path.join(SCRIPT_DIR, "image_review_updated.xlsx");
const DOWNLOAD_DIR = path.join(SCRIPT_DIR, "test_downloads");
const REQUEST_TIMEOUT_MS = 25000;
const SMALL_FILE_KB_THRESHOLD = 10;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const SEARCH_HOST_PATTERNS = ["google.", "bing.", "duckduckgo.", "yahoo.", "yandex.", "search.brave."];
const BAD_IMAGE_WORDS = [
  "logo",
  "icon",
  "sprite",
  "placeholder",
  "loader",
  "spinner",
  "banner",
  "tracking",
  "pixel",
  "analytics",
  "favicon",
  "avatar",
  "payment",
  "social",
  "whatsapp",
];
const REVIEW_URL_RISK_WORDS = ["logo", "banner", "icon", "placeholder", "small", "thumbnail", "thumb", "sprite"];
const PRODUCT_PATH_WORDS = [
  "/product/",
  "/products/",
  "/catalog/",
  "/media/",
  "/uploads/",
  "/images/",
  "/image/",
  "/wp-content/uploads/",
  "/assets/",
  "/product-image/",
];

function safeString(value) {
  return String(value ?? "").trim();
}

function normalizeHeader(value) {
  return safeString(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parsedUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isSearchUrl(value) {
  if (!isHttpUrl(value)) return false;
  const parsed = new URL(value);
  const host = parsed.hostname.toLowerCase();
  const full = parsed.href.toLowerCase();
  return (
    SEARCH_HOST_PATTERNS.some((pattern) => host.includes(pattern)) ||
    full.includes("/search?") ||
    full.includes("tbm=isch") ||
    full.includes("udm=2") ||
    full.includes("images/search") ||
    full.includes("image-search")
  );
}

function isDirectImageUrl(value) {
  if (!isHttpUrl(value) || isSearchUrl(value)) return false;
  const parsed = new URL(value);
  const full = parsed.href.toLowerCase();
  const hostPath = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  if (/\.(jpe?g|png|webp)(?:[?#]|$)/i.test(full)) return true;
  return (
    (hostPath.includes("cdn") ||
      hostPath.includes("static") ||
      hostPath.includes("media") ||
      hostPath.includes("assets") ||
      hostPath.includes("images") ||
      hostPath.includes("imagekit") ||
      hostPath.includes("wp-content/uploads")) &&
    (hostPath.includes("image") || hostPath.includes("product") || hostPath.includes("upload"))
  );
}

function sourceUrlType(value) {
  if (!safeString(value) || !isHttpUrl(value) || isSearchUrl(value)) return "weak";
  const parsed = new URL(value);
  const pathname = parsed.pathname.replace(/\/+$/g, "").toLowerCase();
  const pathParts = pathname.split("/").filter(Boolean);
  if (pathParts.length === 0) return "homepage";

  const lastPart = pathParts[pathParts.length - 1] || "";
  const categorySignals = [
    "category",
    "categories",
    "collection",
    "collections",
    "shop",
    "catalog",
    "products",
    "brand",
    "brands",
    "search",
    "blood-pressure-monitors",
    "digital-thermometers",
    "digital-weighing-scale",
    "blood-glucose-monitors",
    "blood-glucose-monitors-and-test-strips",
  ];
  const productSignals = [
    /\/products?\//,
    /\/product\//,
    /\/product-image\//,
    /\/p\//,
    /\/pd\//,
    /\/item\//,
    /\/dp\//,
    /\/buy\//,
    /\/shop\//,
    /\/[^/]+-\d+(?:\.html)?$/,
    /\/[^/]+\.html$/,
  ];

  if (productSignals.some((pattern) => pattern.test(pathname))) return "product";
  if (categorySignals.some((signal) => lastPart === signal || pathname.endsWith(`/${signal}`))) return "category";
  if (pathParts.length >= 2 && /[a-z0-9]/i.test(lastPart)) return "product";
  return "weak";
}

function classifyRow(row) {
  const directImage = isDirectImageUrl(row.current_product_image_link);
  const sourceType = sourceUrlType(row.source_url);

  if (directImage) {
    return {
      image_status: "usable_direct_image",
      automation_priority: "high",
      automation_action: "download_upload_direct_image_first",
      needs_manual_review: "no",
      reason: "Direct image URL appears usable",
      recommended_next_step: "Download image, verify in review sheet, then upload only after approval",
    };
  }

  if (sourceType === "product") {
    return {
      image_status: "source_url_ready",
      automation_priority: "medium",
      automation_action: "extract_from_source_url",
      needs_manual_review: "no",
      reason: "source_url appears to be a real product page or strong retailer/brand product page",
      recommended_next_step:
        "Run image worker on source_url to extract og:image, twitter:image, JSON-LD image, or main product image",
    };
  }

  if (sourceType === "category") {
    return {
      image_status: "category_source_url",
      automation_priority: "medium",
      automation_action: "extract_from_source_url_with_product_matching",
      needs_manual_review: "yes",
      reason: "source_url appears to be a category/listing page, so product matching is required",
      recommended_next_step:
        "Run image worker on source_url with product-name matching and require manual review before upload",
    };
  }

  return {
    image_status: "missing_or_weak_source_url",
    automation_priority: "low",
    automation_action: "manual_find_official_product_page",
    needs_manual_review: "yes",
    reason: "source_url is missing, homepage-only, search URL, or unclear for automated extraction",
    recommended_next_step: "Manually find official product page or retailer product page",
  };
}

function absoluteUrl(baseUrl, maybeUrl) {
  const raw = safeString(maybeUrl);
  if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return "";
  try {
    return new URL(raw, baseUrl).href;
  } catch {
    return "";
  }
}

function safeFilename(productName, rowNumber, extension = ".jpg") {
  const base =
    safeString(productName)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 85) || "product";
  return `${String(rowNumber).padStart(3, "0")}-${base}${extension}`;
}

function wordsFrom(value) {
  return safeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !["the", "and", "for", "with", "pack", "india"].includes(word));
}

function parseDimension(value) {
  const match = safeString(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function parseSrcset(baseUrl, srcset) {
  return safeString(srcset)
    .split(",")
    .map((part) => {
      const pieces = part.trim().split(/\s+/);
      if (!pieces[0]) return null;
      const url = absoluteUrl(baseUrl, pieces[0]);
      if (!url) return null;
      const widthMatch = safeString(pieces[1]).match(/^(\d+)w$/);
      const densityMatch = safeString(pieces[1]).match(/^([\d.]+)x$/);
      const width = widthMatch ? Number(widthMatch[1]) : densityMatch ? Number(densityMatch[1]) * 1000 : 0;
      return { url, width, height: 0, source: "srcset", context: "" };
    })
    .filter(Boolean);
}

function extractJsonLdImages(jsonLdText, baseUrl) {
  const found = [];
  function collect(value) {
    if (!value) return;
    if (typeof value === "string") {
      const url = absoluteUrl(baseUrl, value);
      if (url) found.push({ url, width: 0, height: 0, source: "json_ld", context: "json-ld image" });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (typeof value === "object") {
      if (value.image) collect(value.image);
      if (value.thumbnailUrl) collect(value.thumbnailUrl);
      if (value.url && (value["@type"] || value.width || value.height)) {
        const url = absoluteUrl(baseUrl, value.url);
        if (url) {
          found.push({
            url,
            width: parseDimension(value.width),
            height: parseDimension(value.height),
            source: "json_ld",
            context: "json-ld url",
          });
        }
      }
      for (const key of ["@graph", "mainEntity", "itemListElement", "offers", "hasVariant"]) {
        if (value[key]) collect(value[key]);
      }
    }
  }
  try {
    collect(JSON.parse(jsonLdText));
  } catch {
    // Malformed JSON-LD is common; ignore rather than failing the product row.
  }
  return found;
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const result = [];
  for (const candidate of candidates) {
    if (!candidate.url || seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    result.push(candidate);
  }
  return result;
}

function candidateScore(candidate, product) {
  const urlLower = candidate.url.toLowerCase();
  const contextLower = safeString(candidate.context).toLowerCase();
  const combined = `${urlLower} ${contextLower}`;
  let score = 0;
  const reasons = [];

  const badWord = BAD_IMAGE_WORDS.find((word) => combined.includes(word));
  if (badWord) {
    score -= 1_000_000;
    reasons.push(`rejected-like-${badWord}`);
  }
  if (/\.(jpe?g|png|webp)(?:[?#]|$)/i.test(candidate.url)) {
    score += 120;
    reasons.push("preferred-image-extension");
  }
  const pathWord = PRODUCT_PATH_WORDS.find((word) => urlLower.includes(word));
  if (pathWord) {
    score += 150;
    reasons.push(`product-path:${pathWord}`);
  }
  const brandWords = wordsFrom(product.brand);
  const productWords = wordsFrom(product.product_name);
  const brandMatch = brandWords.find((word) => combined.includes(word));
  if (brandMatch) {
    score += 120;
    reasons.push(`brand-word:${brandMatch}`);
  }
  const matchedProductWords = productWords.filter((word) => combined.includes(word)).length;
  if (matchedProductWords) {
    score += Math.min(matchedProductWords, 4) * 80;
    reasons.push(`product-words:${matchedProductWords}`);
  }
  if (candidate.width >= 300 && candidate.height >= 300) {
    score += 200;
    reasons.push("dimensions>=300x300");
  } else if (candidate.width >= 300 || candidate.height >= 300) {
    score += 80;
    reasons.push("one-dimension>=300");
  } else if (candidate.width && candidate.height && (candidate.width < 100 || candidate.height < 100)) {
    score -= 400;
    reasons.push("too-small");
  }
  if (candidate.source === "direct_image") {
    score += 250;
    reasons.push("direct-image-link");
  } else if (candidate.source === "json_ld") {
    score += 40;
    reasons.push("json-ld");
  } else if (candidate.source === "img" || candidate.source === "srcset") {
    score += 30;
    reasons.push("page-img");
  } else if (candidate.source === "og_image" || candidate.source === "twitter_image") {
    score += 20;
    reasons.push(candidate.source.replace("_", "-"));
  }
  return { score, reasons };
}

async function fetchPage(sourceUrl) {
  const response = await axios.get(sourceUrl, {
    timeout: REQUEST_TIMEOUT_MS,
    maxRedirects: 5,
    responseType: "text",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });
  return response.data;
}

function extractCandidatesFromHtml(html, sourceUrl) {
  const $ = cheerio.load(html);
  const candidates = [];
  $('meta[property="og:image"], meta[property="og:image:url"], meta[property="og:image:secure_url"]').each((_, el) => {
    const url = absoluteUrl(sourceUrl, $(el).attr("content"));
    if (url) candidates.push({ url, width: 0, height: 0, source: "og_image", context: "og:image" });
  });
  $('meta[name="twitter:image"], meta[property="twitter:image"]').each((_, el) => {
    const url = absoluteUrl(sourceUrl, $(el).attr("content"));
    if (url) candidates.push({ url, width: 0, height: 0, source: "twitter_image", context: "twitter:image" });
  });
  $('script[type*="ld+json"]').each((_, el) => {
    candidates.push(...extractJsonLdImages($(el).contents().text(), sourceUrl));
  });
  $("img").each((_, el) => {
    const attrs = el.attribs || {};
    const context = [
      attrs.alt,
      attrs.title,
      attrs.class,
      attrs.id,
      $(el).parent().attr("class"),
      $(el).parent().parent().attr("class"),
    ]
      .filter(Boolean)
      .join(" ");
    const srcset = attrs.srcset || attrs["data-srcset"];
    if (srcset) {
      candidates.push(...parseSrcset(sourceUrl, srcset).map((candidate) => ({ ...candidate, context })));
    }
    const rawUrl =
      attrs.src ||
      attrs["data-src"] ||
      attrs["data-original"] ||
      attrs["data-lazy-src"] ||
      attrs["data-image"] ||
      attrs["data-zoom-image"];
    const url = absoluteUrl(sourceUrl, rawUrl);
    if (url) {
      candidates.push({
        url,
        width: parseDimension(attrs.width || attrs["data-width"]),
        height: parseDimension(attrs.height || attrs["data-height"]),
        source: "img",
        context,
      });
    }
  });
  return dedupeCandidates(candidates);
}

function selectCandidates(candidates, product) {
  return candidates
    .map((candidate) => {
      const scoring = candidateScore(candidate, product);
      return { ...candidate, score: scoring.score, reasons: scoring.reasons };
    })
    .filter((candidate) => candidate.score > -500_000)
    .sort((a, b) => b.score - a.score);
}

async function downloadImage(imageUrl, productName, rowNumber) {
  const response = await axios.get(imageUrl, {
    timeout: REQUEST_TIMEOUT_MS,
    maxRedirects: 5,
    responseType: "arraybuffer",
    headers: { "User-Agent": USER_AGENT, Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
    validateStatus: (status) => status >= 200 && status < 400,
  });
  const buffer = Buffer.from(response.data);
  const contentType = safeString(response.headers["content-type"]).split(";")[0];
  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(buffer);
  const extension =
    detected?.ext || (contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg");
  const filePath = path.join(DOWNLOAD_DIR, safeFilename(productName, rowNumber, `.${extension}`));
  fs.writeFileSync(filePath, buffer);
  return {
    download_success: "yes",
    content_type: detected?.mime || contentType || "unknown",
    file_size_kb: Math.round((buffer.length / 1024) * 10) / 10,
    local_download_path: filePath,
  };
}

function readPlanningWorkbook() {
  const workbook = xlsx.readFile(INPUT_FILE);
  const sheetName = workbook.Sheets.product_image_next_steps ? "product_image_next_steps" : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" }).map((row, index) => ({
    row_number: index + 2,
    product_name: safeString(row.product_name),
    brand: safeString(row.brand),
    category: safeString(row.category),
    source_url: safeString(row.source_url),
    current_product_image_link: safeString(row.current_product_image_link),
    image_link_type: safeString(row.image_link_type),
    image_status: safeString(row.image_status),
    automation_priority: safeString(row.automation_priority),
    automation_action: safeString(row.automation_action),
    needs_manual_review: safeString(row.needs_manual_review),
    reason: safeString(row.reason),
    recommended_next_step: safeString(row.recommended_next_step),
  }));
  return { workbook, sheetName, rows };
}

function writeReclassifiedWorkbook(rows) {
  const headers = [
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
  const workbook = xlsx.utils.book_new();
  const data = rows.map((row) => Object.fromEntries(headers.map((header) => [header, row[header] || ""])));
  const sheet = xlsx.utils.json_to_sheet(data, { header: headers });
  sheet["!cols"] = headers.map((header) => ({ wch: header.includes("url") || header.includes("step") || header === "reason" ? 60 : 24 }));
  xlsx.utils.book_append_sheet(workbook, sheet, "product_image_next_steps");

  const statusCounts = {};
  const priorityCounts = {};
  for (const row of rows) {
    statusCounts[row.image_status] = (statusCounts[row.image_status] || 0) + 1;
    priorityCounts[row.automation_priority] = (priorityCounts[row.automation_priority] || 0) + 1;
  }
  const summaryRows = [
    { metric: "total_products", value: rows.length },
    { metric: "count_usable_direct_image", value: statusCounts.usable_direct_image || 0 },
    { metric: "count_source_url_ready", value: statusCounts.source_url_ready || 0 },
    { metric: "count_category_source_url", value: statusCounts.category_source_url || 0 },
    { metric: "count_missing_or_weak_source_url", value: statusCounts.missing_or_weak_source_url || 0 },
    { metric: "count_needs_manual_review", value: rows.filter((row) => row.needs_manual_review === "yes").length },
    { metric: "count_high_priority", value: priorityCounts.high || 0 },
    { metric: "count_medium_priority", value: priorityCounts.medium || 0 },
    { metric: "count_low_priority", value: priorityCounts.low || 0 },
  ];
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(summaryRows), "summary");
  xlsx.writeFile(workbook, RECLASSIFIED_FILE);
}

function writeResults(rows, outputFile, sheetName) {
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet(rows);
  sheet["!cols"] = Object.keys(rows[0] || { product_name: "" }).map((key) => ({
    wch: key.includes("url") || key.includes("path") || key.includes("notes") || key.includes("reason") ? 70 : 22,
  }));
  xlsx.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  xlsx.writeFile(workbook, outputFile);
}

function possibleUrlIssue(url) {
  const lower = safeString(url).toLowerCase();
  return REVIEW_URL_RISK_WORDS.filter((word) => lower.includes(word));
}

function buildReviewRows(testRows) {
  const urlCounts = new Map();
  for (const row of testRows) {
    if (row.selected_image_url) urlCounts.set(row.selected_image_url, (urlCounts.get(row.selected_image_url) || 0) + 1);
  }
  return testRows.map((row) => {
    const urlIssueWords = possibleUrlIssue(row.selected_image_url);
    const isDuplicate = row.selected_image_url && (urlCounts.get(row.selected_image_url) || 0) > 1;
    const isSmall = Number(row.file_size_kb || 0) > 0 && Number(row.file_size_kb || 0) < SMALL_FILE_KB_THRESHOLD;
    const isCategory = row.image_status === "category_source_url";
    const isGeneric = /category|collections?|brandstore|catalog\/brandstore/i.test(row.selected_image_url || "");
    const hasIssue =
      isDuplicate ||
      isSmall ||
      urlIssueWords.length > 0 ||
      isCategory ||
      isGeneric ||
      row.status !== "success";
    const notes = [];
    if (isDuplicate) notes.push("Duplicate selected image URL across multiple products; verify each product has the right image.");
    if (isSmall) notes.push(`Downloaded file is below ${SMALL_FILE_KB_THRESHOLD} KB; inspect resolution and product visibility.`);
    if (urlIssueWords.length) notes.push(`Image URL contains quality-risk words: ${urlIssueWords.join(", ")}.`);
    if (isCategory) notes.push("Source URL is a category page; confirm selected image matches the exact product.");
    if (isGeneric) notes.push("Selected image URL appears generic/category-level; inspect before approval.");
    if (row.status !== "success") notes.push("Pipeline did not download a usable image; replace manually or rerun with a better source URL.");
    if (!notes.length) notes.push("Review visual match, crop, variant, and image clarity before approving upload.");

    return {
      row_number: row.row_number,
      product_name: row.product_name,
      brand: row.brand,
      category: row.category,
      source_url: row.source_url,
      selected_image_url: row.selected_image_url,
      selected_reason: row.selected_reason,
      file_size_kb: row.file_size_kb,
      content_type: row.content_type,
      local_download_path: row.local_download_path,
      possible_quality_issue: hasIssue ? "yes" : "no",
      reviewer_decision: "",
      final_action: "",
      notes: notes.join(" "),
    };
  });
}

async function testReadyRow(row) {
  const notes = [];
  const candidates = [];
  if (isSearchUrl(row.current_product_image_link)) {
    notes.push("Ignored search result current_product_image_link.");
  } else if (isDirectImageUrl(row.current_product_image_link)) {
    candidates.push({
      url: row.current_product_image_link,
      width: 0,
      height: 0,
      source: "direct_image",
      context: "current_product_image_link",
    });
  } else if (row.current_product_image_link) {
    notes.push("Skipped non-direct current_product_image_link.");
  }

  if (row.source_url && isHttpUrl(row.source_url) && !isSearchUrl(row.source_url)) {
    try {
      const html = await fetchPage(row.source_url);
      candidates.push(...extractCandidatesFromHtml(html, row.source_url));
    } catch (error) {
      notes.push(`source_url fetch/extract failed: ${error.message}`);
    }
  } else if (row.automation_action !== "download_upload_direct_image_first") {
    notes.push("source_url missing, invalid, or search URL.");
  }

  const uniqueCandidates = dedupeCandidates(candidates);
  const scored = selectCandidates(uniqueCandidates, row);
  let selected = null;
  let selectedReason = "No product-like image candidate after filtering";
  let download = { download_success: "no", content_type: "", file_size_kb: "", local_download_path: "" };

  for (const candidate of scored.slice(0, 8)) {
    selected = candidate;
    selectedReason = `score=${candidate.score}; ${candidate.reasons.slice(0, 5).join(", ")}`;
    try {
      download = await downloadImage(candidate.url, row.product_name, row.row_number);
      break;
    } catch (error) {
      notes.push(`candidate download failed: ${candidate.url} (${error.message})`);
    }
  }

  const status = selected?.url
    ? download.download_success === "yes"
      ? "success"
      : "image_found_download_failed"
    : "no_image_found";

  return {
    row_number: row.row_number,
    product_name: row.product_name,
    brand: row.brand,
    category: row.category,
    source_url: row.source_url,
    current_product_image_link: row.current_product_image_link,
    image_status: row.image_status,
    automation_action: row.automation_action,
    candidates_found_count: uniqueCandidates.length,
    all_candidate_urls: uniqueCandidates.map((candidate) => candidate.url).join("\n"),
    selected_image_url: selected?.url || "",
    selected_reason: selectedReason,
    download_success: download.download_success,
    content_type: download.content_type,
    file_size_kb: download.file_size_kb,
    local_download_path: download.local_download_path,
    status,
    notes: notes.join("; "),
  };
}

async function main() {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  const { rows } = readPlanningWorkbook();
  const reclassifiedRows = rows.map((row) => ({ ...row, ...classifyRow(row) }));
  writeReclassifiedWorkbook(reclassifiedRows);

  const readyActions = new Set([
    "download_upload_direct_image_first",
    "extract_from_source_url",
    "extract_from_source_url_with_product_matching",
  ]);
  const readyRows = reclassifiedRows.filter((row) => readyActions.has(row.automation_action));
  const testRows = [];
  for (let index = 0; index < readyRows.length; index += 1) {
    const result = await testReadyRow(readyRows[index]);
    testRows.push(result);
    console.log(
      `${index + 1}/${readyRows.length}. row ${result.row_number} ${result.product_name} | candidates=${result.candidates_found_count} | download=${result.download_success} | status=${result.status}`,
    );
  }

  writeResults(testRows, TEST_RESULTS_FILE, "image_pipeline_test_results_updated");
  const reviewRows = buildReviewRows(testRows);
  writeResults(reviewRows, REVIEW_FILE, "image_review_updated");

  const selectedUrlCounts = new Map();
  for (const row of testRows) {
    if (row.selected_image_url) {
      selectedUrlCounts.set(row.selected_image_url, (selectedUrlCounts.get(row.selected_image_url) || 0) + 1);
    }
  }
  const duplicateSelectedUrls = [...selectedUrlCounts.values()].filter((count) => count > 1).length;
  const smallImageWarnings = reviewRows.filter((row) => Number(row.file_size_kb || 0) > 0 && Number(row.file_size_kb || 0) < SMALL_FILE_KB_THRESHOLD);
  const needsReview = reviewRows.filter((row) => row.possible_quality_issue === "yes");
  const readyForApproval = reviewRows.filter((row) => row.possible_quality_issue === "no");

  console.log("");
  console.log("Summary");
  console.log(`total_rows=${reclassifiedRows.length}`);
  console.log(`rows_ready_for_testing=${readyRows.length}`);
  console.log(`rows_tested=${testRows.length}`);
  console.log(`images_found=${testRows.filter((row) => row.selected_image_url).length}`);
  console.log(`images_downloaded_successfully=${testRows.filter((row) => row.download_success === "yes").length}`);
  console.log(`duplicate_selected_image_urls=${duplicateSelectedUrls}`);
  console.log(`small_image_warnings=${smallImageWarnings.length}`);
  console.log(`products_need_manual_review=${needsReview.length}`);
  console.log(`products_ready_for_approval_upload=${readyForApproval.length}`);
  console.log(`reclassified_workbook=${RECLASSIFIED_FILE}`);
  console.log(`test_results=${TEST_RESULTS_FILE}`);
  console.log(`review_sheet=${REVIEW_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
