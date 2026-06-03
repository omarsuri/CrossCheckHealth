const asArray = (value: any) => (Array.isArray(value) ? value : value ? [value] : []);

const toNumber = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const unique = (items: any[]) => Array.from(new Set(items.filter(Boolean).map(String)));

const PLACEHOLDER_INGREDIENT_PATTERNS = [
  /ingredient\/spec details are not listed/i,
  /ingredient details/i,
  /ingredient evidence notes are not available/i,
  /ingredient research notes are not available/i,
  /ingredients? not verified/i,
  /not listed/i,
  /not available/i,
  /specs? not listed/i,
  /product spec/i,
  /workbook listed ingredient\/spec/i,
  /preventive product catalogue/i,
];

const isRealIngredientText = (value: any) => {
  const text = String(value ?? "").trim();
  if (!text) return false;
  return !PLACEHOLDER_INGREDIENT_PATTERNS.some((pattern) => pattern.test(text));
};

const normalizeMainIngredient = (ingredient: any) => {
  if (!ingredient || typeof ingredient !== "object") return null;
  const name = ingredient.name || ingredient.ingredient_name;
  if (!isRealIngredientText(name)) return null;

  const amount = [ingredient.amount, ingredient.per ? `per ${ingredient.per}` : null].filter(Boolean).join(" ");
  const detailParts = [
    ingredient.scientific_name,
    ingredient.part_used,
  ].filter(isRealIngredientText);

  return {
    name,
    amount: isRealIngredientText(amount) ? amount : "",
    status: ingredient.status || "verified",
    evidenceLevel: ingredient.evidence_level || "Verified ingredient",
    type: ingredient.part_used || ingredient.type || ingredient.ingredient_type || "Ingredient",
    microcopy: detailParts.length > 0 ? detailParts.join(" / ") : "Verified ingredient",
  };
};

const normalizeRelationIngredient = (ingredient: any) => {
  if (!ingredient || typeof ingredient !== "object") return null;
  const name = ingredient.ingredient_name || ingredient.name;
  if (!isRealIngredientText(name) || !isRealIngredientText(ingredient.microcopy || ingredient.evidence_level || name)) return null;
  return {
    id: ingredient.id,
    name,
    amount: isRealIngredientText(ingredient.amount) ? ingredient.amount : "",
    status: ingredient.status || "und",
    evidenceLevel: ingredient.evidence_level || "Declared ingredient",
    type: ingredient.ingredient_type || ingredient.type || "Ingredient",
    microcopy: ingredient.microcopy || (ingredient.evidence_level ? `Evidence: ${ingredient.evidence_level}` : "Declared ingredient"),
  };
};

const verdictColor = (key?: string, warnings: any[] = []) => {
  if (key === "yes") return "green";
  if (key === "no" || warnings.some((warning) => warning.severity === "high")) return "red";
  return "amber";
};

const verdictLabel = (key?: string, fallback?: string) => {
  if (fallback) return fallback;
  if (key === "yes") return "Strong Choice";
  if (key === "no") return "Use With Caution";
  return "Compare First";
};

export function normalizeProduct(product: any) {
  const category = Array.isArray(product.product_categories) ? product.product_categories[0] : product.product_categories;
  const score = asArray(product.product_scores)[0] ?? {};
  const mainIngredients = asArray(product.main_ingredients).map(normalizeMainIngredient).filter(Boolean);
  const relationIngredients = asArray(product.product_ingredients).map(normalizeRelationIngredient).filter(Boolean);
  const ingredients = mainIngredients.length > 0 ? mainIngredients : relationIngredients;
  const warnings = asArray(product.product_warnings);
  const tags = asArray(product.product_tags).map((tag: any) => tag.label || tag.tag || tag.name);
  const categoryName = product.category || category?.name || "Not listed";
  const categorySlug = product.cat || category?.slug || "wellness";
  const form = product.form || product.product_form || "Not listed";
  const formLabel = product.subcategory || product.form_label || form;
  const dietLabel = product.diet_label || (product.diet_type === "veg" ? "Vegetarian" : product.diet_type === "nonveg" ? "Non-Veg" : product.diet_type || "Not listed");
  const familySafety = toNumber(score.family_safety_score ?? score.parent_score ?? product.family_safety_score, 0);
  const science = toNumber(score.science_score, 0);
  const value = toNumber(score.value_score, 0);
  const safety = toNumber(score.safety_score, 0);
  const efficacy = toNumber(score.efficacy_score, 0);
  const transparency = toNumber(score.transparency_score, 0);
  const fssai = Boolean(product.is_fssai_certified ?? product.fssai_verified);
  const labTested = Boolean(product.is_lab_tested);
  const safeForElderly = Boolean(product.safe_for_elderly) || familySafety >= 80;
  const chips = unique([
    ...asArray(product.chips),
    ...asArray(product.certifications),
    ...tags,
    fssai ? "FSSAI Certified" : null,
    labTested ? "Lab Tested" : null,
    product.is_vegetarian ? "Vegetarian" : null,
    product.is_sugar_free ? "Sugar Free" : null,
    safeForElderly ? "Safe for Elderly" : null,
    value >= 85 ? "Budget Pick" : null,
  ]);
  const interpretation = product.interpretation || score.verdict_text || product.description || "Evidence not available.";
  const practicalTake = product.practical_take || interpretation;
  const verdictKey = score.verdict_key || "conditional";
  const verdict = product.verdict || score.verdict || verdictLabel(verdictKey);

  return {
    id: product.id,
    sourceProductId: product.source_product_id,
    name: product.name,
    brand: product.brand || "Brand not listed",
    category: categoryName,
    categorySlug,
    cat: categorySlug,
    productType: product.product_type || product.subcategory,
    primaryUse: product.primary_use,
    packVariant: product.pack_variant,
    form,
    formLabel,
    price: toNumber(product.price),
    originalPrice: toNumber(product.original_price),
    origPrice: toNumber(product.original_price),
    priceUnit: product.price_unit || "",
    currency: product.currency || "INR",
    rating: toNumber(product.rating),
    reviewCount: toNumber(product.review_count),
    reviews: toNumber(product.review_count),
    verdict,
    verdictKey,
    verdictColor: verdictColor(verdictKey, warnings),
    interpretation,
    verdictText: interpretation,
    quickInterpretation: interpretation,
    practicalTake,
    dietLabel,
    diet: product.diet_type,
    imageUrl: product.image_url,
    productImage: product.image_url,
    imageSourceUrl: product.image_source_url,
    labelImage: product.label_image_url,
    imageSearchUrl: product.image_search_url,
    imageStatus: product.image_status,
    imageCheckedAt: product.image_checked_at,
    imageLinkType: product.image_link_type,
    imageVerificationNotes: product.image_verification_notes,
    sourceName: product.source_name,
    sourceUrl: product.source_url,
    indiaAvailabilityEvidence: product.india_availability_evidence,
    reviewStatus: product.review_status,
    sourceNotes: product.source_notes,
    lastChecked: product.last_checked,
    affiliateUrl: product.affiliate_url,
    affiliateLink: product.affiliate_url,
    chips,
    certifications: unique(asArray(product.certifications)),
    fssai,
    labTested,
    safeElders: safeForElderly,
    discounted: toNumber(product.original_price) > toNumber(product.price),
    scores: {
      science,
      value,
      safety,
      efficacy,
      transparency,
      familySafety,
    },
    scienceScore: science,
    valueScore: value,
    safetyScore: safety,
    efficacyScore: efficacy,
    transparency,
    parentScore: familySafety,
    softScores: {
      integrity: safety,
      transparency,
      research: science,
      balance: efficacy,
      exposure: Math.max(0, 100 - toNumber(score.hype_score, 0)),
      value,
    },
    mainIngredients,
    ingredientSourceUrl: product.ingredient_source_url,
    ingredientSourceName: product.ingredient_source_name,
    ingredientVerified: Boolean(product.ingredient_verified),
    ingredientReviewStatus: product.ingredient_review_status,
    ingredientCheckedAt: product.ingredient_checked_at,
    ingredients: ingredients.map((ingredient: any) => ({
      id: ingredient.id,
      name: ingredient.name,
      amount: ingredient.amount || "",
      status: ingredient.status || "und",
      evidenceLevel: ingredient.evidenceLevel || "Declared ingredient",
      type: ingredient.type || "Ingredient",
      microcopy: ingredient.microcopy || "Declared ingredient",
    })),
    ingredientCards: ingredients.map((ingredient: any) => ({
      name: ingredient.name,
      amount: ingredient.amount || "",
      type: ingredient.type || "Ingredient",
      color: ["good", "eff", "verified"].includes(ingredient.status) ? "green" : ["warn", "con"].includes(ingredient.status) ? "amber" : "teal",
      microcopy: ingredient.microcopy || "Declared ingredient",
    })),
    warnings: warnings.map((warning: any) => ({
      id: warning.id,
      title: warning.warning_title,
      text: warning.warning_text || "Review this caution before use.",
      severity: warning.severity || "medium",
      label: warning.caution_label || "Caution",
    })),
    threats: warnings.map((warning: any) => ({
      title: warning.warning_title,
      text: warning.warning_text || "Review this caution before use.",
      severity: warning.severity || "medium",
    })),
    usp: {
      headline: product.usp_headline || verdict,
      context: product.usp_context || practicalTake,
    },
    researchPanels: {
      ingredientResearch: isRealIngredientText(product.ingredient_research) ? product.ingredient_research : "Ingredients not verified yet",
      consumerTransparency: product.consumer_transparency || product.source_url || "Transparency notes are not available yet.",
      wellnessContext: product.wellness_context || product.primary_use || "Use this as preventive product guidance, not medical advice.",
      exposureInterpretation: product.exposure_interpretation || product.image_verification_notes || (warnings.length > 0 ? "Review cautions before using this product." : "No major warning has been captured in the product database yet."),
      evidenceStrength: product.evidence_strength || product.review_status || (science >= 80 ? "Strong evidence" : science >= 60 ? "Moderate evidence" : "Limited evidence"),
    },
    wellnessMarkers: asArray(product.wellness_markers),
  };
}

export function normalizeProducts(products: any[]) {
  return products.map(normalizeProduct);
}
