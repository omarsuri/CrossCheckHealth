const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const axios = require("axios");
const cheerio = require("cheerio");

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const INPUT_FILE = path.join(PROJECT_ROOT, "product_image_next_steps.xlsx");
const OUTPUT_FILE = path.join(SCRIPT_DIR, "image_pipeline_test_results.xlsx");
const DOWNLOAD_DIR = path.join(SCRIPT_DIR, "test_downloads");
const ROW_LIMIT = 15;
const REQUEST_TIMEOUT_MS = 25000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const SEARCH_HOST_PATTERNS = [
  "google.",
  "bing.",
  "duckduckgo.",
  "yahoo.",
  "yandex.",
  "search.brave.",
];

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
];

function safeString(value) {
  return String(value ?? "").trim();
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
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
      hostPath.includes("wp-content/uploads")) &&
    (hostPath.includes("image") || hostPath.includes("product") || hostPath.includes("upload"))
  );
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

function safeFilename(productName, fallbackIndex, extension = ".jpg") {
  const base =
    safeString(productName)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || `product-${fallbackIndex}`;
  return `${base}${extension}`;
}

function wordsFrom(value) {
  return safeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !["the", "and", "for", "with"].includes(word));
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
      return { url, width, height: 0, source: "srcset" };
    })
    .filter(Boolean);
}

function extractJsonLdImages(jsonLdText, baseUrl) {
  const found = [];

  function collect(value) {
    if (!value) return;
    if (typeof value === "string") {
      const url = absoluteUrl(baseUrl, value);
      if (url) found.push({ url, width: 0, height: 0, source: "json_ld" });
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
          });
        }
      }
      for (const key of ["@graph", "mainEntity", "itemListElement", "offers"]) {
        if (value[key]) collect(value[key]);
      }
    }
  }

  try {
    collect(JSON.parse(jsonLdText));
  } catch {
    const objectMatches = safeString(jsonLdText).match(/\{[\s\S]*?\}/g) || [];
    for (const objectText of objectMatches) {
      try {
        collect(JSON.parse(objectText));
      } catch {
        // Keep scanning other JSON-LD fragments.
      }
    }
  }

  return found;
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

  for (const word of PRODUCT_PATH_WORDS) {
    if (urlLower.includes(word)) {
      score += 150;
      reasons.push(`product-path:${word}`);
      break;
    }
  }

  const brandWords = wordsFrom(product.brand);
  const productWords = wordsFrom(product.product_name);
  for (const word of brandWords) {
    if (combined.includes(word)) {
      score += 120;
      reasons.push(`brand-word:${word}`);
      break;
    }
  }
  let matchedProductWords = 0;
  for (const word of productWords) {
    if (combined.includes(word)) matchedProductWords += 1;
  }
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

  if (candidate.source === "img") {
    score += 30;
    reasons.push("page-img");
  } else if (candidate.source === "json_ld") {
    score += 40;
    reasons.push("json-ld");
  } else if (candidate.source === "og_image" || candidate.source === "twitter_image") {
    score += 20;
    reasons.push(candidate.source.replace("_", "-"));
  } else if (candidate.source === "direct_image") {
    score += 250;
    reasons.push("direct-image-link");
  }

  return { score, reasons };
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
      attrs.loading,
      attrs.decoding,
      $(el).parent().attr("class"),
    ]
      .filter(Boolean)
      .join(" ");
    const srcset = attrs.srcset || attrs["data-srcset"];
    if (srcset) {
      for (const candidate of parseSrcset(sourceUrl, srcset)) {
        candidates.push({ ...candidate, context });
      }
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

function selectCandidate(candidates, product) {
  const scored = candidates
    .map((candidate) => {
      const scoring = candidateScore(candidate, product);
      return { ...candidate, score: scoring.score, reasons: scoring.reasons };
    })
    .filter((candidate) => candidate.score > -500_000)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return { selected: null, reason: "No product-like image candidate after filtering", scored: [] };
  }

  const selected = scored[0];
  return {
    selected,
    reason: `score=${selected.score}; ${selected.reasons.slice(0, 5).join(", ")}`,
    scored,
  };
}

async function downloadImage(imageUrl, productName, index) {
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
    detected?.ext ||
    (contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg");
  const filename = safeFilename(productName, index, `.${extension}`);
  const filePath = path.join(DOWNLOAD_DIR, filename);
  fs.writeFileSync(filePath, buffer);

  return {
    download_success: "yes",
    content_type: detected?.mime || contentType || "unknown",
    file_size_kb: Math.round((buffer.length / 1024) * 10) / 10,
    saved_file: filePath,
  };
}

function readProducts() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Input file not found: ${INPUT_FILE}`);
  }
  const workbook = xlsx.readFile(INPUT_FILE);
  const sheet = workbook.Sheets["product_image_next_steps"] || workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  return rows.slice(0, ROW_LIMIT).map((row) => ({
    product_name: safeString(row.product_name),
    brand: safeString(row.brand),
    category: safeString(row.category),
    source_url: safeString(row.source_url),
    current_product_image_link: safeString(row.current_product_image_link),
    image_status: safeString(row.image_status),
    automation_action: safeString(row.automation_action),
  }));
}

function writeResults(results) {
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(results);
  worksheet["!cols"] = [
    { wch: 38 },
    { wch: 58 },
    { wch: 18 },
    { wch: 22 },
    { wch: 70 },
    { wch: 48 },
    { wch: 18 },
    { wch: 24 },
    { wch: 14 },
    { wch: 18 },
    { wch: 58 },
  ];
  xlsx.utils.book_append_sheet(workbook, worksheet, "image_pipeline_test_results");
  xlsx.writeFile(workbook, OUTPUT_FILE);
}

async function processProduct(product, index) {
  const notes = [];
  const candidates = [];
  let directImageTested = "no";

  if (isSearchUrl(product.current_product_image_link)) {
    notes.push("Ignored search result current_product_image_link");
  } else if (isDirectImageUrl(product.current_product_image_link)) {
    directImageTested = "yes";
    candidates.push({
      url: product.current_product_image_link,
      width: 0,
      height: 0,
      source: "direct_image",
      context: "current_product_image_link",
    });
  } else if (product.current_product_image_link) {
    notes.push("Skipped non-direct current_product_image_link");
  }

  if (product.source_url && isHttpUrl(product.source_url) && !isSearchUrl(product.source_url)) {
    try {
      const html = await fetchPage(product.source_url);
      candidates.push(...extractCandidatesFromHtml(html, product.source_url));
    } catch (error) {
      notes.push(`source_url fetch/extract failed: ${error.message}`);
    }
  } else {
    notes.push("source_url missing, invalid, or search URL");
  }

  const uniqueCandidates = dedupeCandidates(candidates);
  const selection = selectCandidate(uniqueCandidates, product);
  let selected = selection.selected;
  let reason = selection.reason;
  let download = {
    download_success: "no",
    content_type: "",
    file_size_kb: "",
    saved_file: "",
  };

  for (const candidate of selection.scored.slice(0, 8)) {
    selected = candidate;
    reason = `score=${candidate.score}; ${candidate.reasons.slice(0, 5).join(", ")}`;
    try {
      download = await downloadImage(candidate.url, product.product_name, index);
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
    product_name: product.product_name,
    source_url: product.source_url,
    direct_image_tested: directImageTested,
    candidates_found_count: uniqueCandidates.length,
    selected_image_url: selected?.url || "",
    selected_reason: reason,
    download_success: download.download_success,
    content_type: download.content_type,
    file_size_kb: download.file_size_kb,
    status,
    notes: notes.join("; "),
    saved_file: download.saved_file,
  };
}

async function main() {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  const products = readProducts();
  const results = [];

  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    const result = await processProduct(product, index + 1);
    results.push(result);
    console.log(
      `${index + 1}. ${result.product_name} | candidates=${result.candidates_found_count} | ` +
        `download=${result.download_success} | status=${result.status}`,
    );
  }

  writeResults(results);

  const tested = results.length;
  const found = results.filter((row) => row.selected_image_url).length;
  const downloaded = results.filter((row) => row.download_success === "yes").length;
  const failed = results.filter((row) => row.status !== "success").map((row) => row.product_name);
  const sourceUrlGoodEnough = downloaded >= Math.ceil(tested * 0.8) && failed.length <= 3;

  console.log("");
  console.log("Summary");
  console.log(`tested=${tested}`);
  console.log(`image_urls_found=${found}`);
  console.log(`downloaded_successfully=${downloaded}`);
  console.log(`failed_products=${failed.length ? failed.join(" | ") : "none"}`);
  console.log(`source_urls_good_enough_for_automation=${sourceUrlGoodEnough ? "yes" : "needs_review"}`);
  console.log(`results=${OUTPUT_FILE}`);
  console.log(`downloads=${DOWNLOAD_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
