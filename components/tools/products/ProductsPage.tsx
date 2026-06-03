"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MOCK_ASSESSMENTS, MOCK_DOCTORS, MOCK_PARENTS } from "@/data/mockDashboard";
import { RAKTASETU_TESTS } from "@/data/mockBloodTests";
import { BODY_FITNESS_STEPS } from "@/data/bodyQuestions";
import { QUICK_HEART_QUESTIONS, DETAILED_HEART_QUESTIONS } from "@/data/heartQuestions";
import { PCOS_STEPS } from "@/data/pcosQuestions";
import { LEGAL_DOCS } from "@/data/legalDocs";
import { ECGBackground, MagneticWrap, ScoreRing, ShareButtons, TiltCard, track, useMouseParallax, useScrollReveal, useTilt } from "@/components/shared/prototype";
import { LockedModal } from "@/components/auth/LockedModal";
import { ScannerModal } from "@/components/tools/products/ProductScanner";
import { ProductCardV2, ProductComparisonPanel, ProductDetailV2, getProductScores, getProductVerdict } from "@/components/tools/products/ProductVisuals";

const productLabels = {
  capsule: "Capsule",
  softgel: "Softgel",
  tablet: "Tablet",
  powder: "Powder/Paste",
  gummy: "Gummy",
  veg: "Vegetarian",
  vegan: "Vegan",
  nonveg: "Non-Veg",
  yes: "Worth Buying",
  conditional: "Conditional",
  no: "Not Recommended",
};

const verdictColors = {
  yes: "green",
  conditional: "amber",
  no: "red",
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeRelation = (value) => Array.isArray(value) ? value : value ? [value] : [];
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
const isRealIngredientText = (value) => {
  const text = String(value ?? "").trim();
  return Boolean(text) && !PLACEHOLDER_INGREDIENT_PATTERNS.some((pattern) => pattern.test(text));
};
const normalizeMainIngredient = (ingredient) => {
  if (!ingredient || typeof ingredient !== "object") return null;
  const name = ingredient.name || ingredient.ingredient_name;
  if (!isRealIngredientText(name)) return null;
  const amount = [ingredient.amount, ingredient.per ? `per ${ingredient.per}` : null].filter(Boolean).join(" ");
  return {
    name,
    amount: isRealIngredientText(amount) ? amount : "",
    status: ingredient.status || "verified",
    type: ingredient.part_used || ingredient.type || "Ingredient",
    microcopy: [ingredient.scientific_name, ingredient.part_used].filter(isRealIngredientText).join(" / ") || "Verified ingredient",
  };
};
const normalizeProductIngredient = (ingredient) => {
  if (!ingredient || typeof ingredient !== "object") return null;
  const name = ingredient.ingredient_name || ingredient.name;
  if (!isRealIngredientText(name)) return null;
  return {
    name,
    amount: isRealIngredientText(ingredient.amount) ? ingredient.amount : "",
    status: ingredient.status || "und",
    type: ingredient.ingredient_type || ingredient.type || "Ingredient",
    microcopy: ingredient.microcopy || ingredient.evidence_level || "Declared ingredient",
  };
};

const mapApiProduct = (product) => {
  if (product?.scores) {
    return {
      ...product,
      cat: product.cat || product.categorySlug || "wellness",
      category: product.category || "Not listed",
      categoryLabel: product.category || "Not listed",
      subcategory: product.formLabel || product.form || "Not listed",
      form: product.form || "Not listed",
      formLabel: product.formLabel || product.form || "Not listed",
      price: toNumber(product.price),
      origPrice: toNumber(product.originalPrice ?? product.origPrice),
      originalPrice: toNumber(product.originalPrice ?? product.origPrice),
      reviews: toNumber(product.reviewCount ?? product.reviews),
      reviewCount: toNumber(product.reviewCount ?? product.reviews),
      verdictColor: product.verdictColor || "amber",
      verdictKey: product.verdictKey || "conditional",
      verdictText: product.interpretation || product.verdictText || "Evidence not available.",
      description: product.interpretation || product.description || "Evidence not available.",
      practicalTake: product.practicalTake || product.interpretation || "Evidence not available.",
      affiliateLink: product.affiliateUrl || product.affiliateLink,
      productImage: product.imageUrl || product.productImage,
      imageUrl: product.imageUrl || product.productImage,
      safeElders: Boolean(product.safeElders),
      fssai: Boolean(product.fssai),
      discounted: toNumber(product.originalPrice ?? product.origPrice) > toNumber(product.price),
      scienceScore: toNumber(product.scores.science),
      valueScore: toNumber(product.scores.value),
      safetyScore: toNumber(product.scores.safety),
      efficacyScore: toNumber(product.scores.efficacy),
      transparency: toNumber(product.scores.transparency),
      parentScore: toNumber(product.scores.familySafety),
      ingredients: normalizeRelation(product.ingredients),
      threats: normalizeRelation(product.warnings || product.threats).map((warning) => ({
        title: warning.title || warning.warning_title,
        text: warning.text || warning.warning_text || "Review this caution before use.",
        severity: warning.severity || "medium",
      })),
    };
  }

  const category = Array.isArray(product.product_categories) ? product.product_categories[0] : product.product_categories;
  const scores = normalizeRelation(product.product_scores);
  const score = scores[0] || {};
  const mainIngredients = normalizeRelation(product.main_ingredients).map(normalizeMainIngredient).filter(Boolean);
  const relationIngredients = normalizeRelation(product.product_ingredients).map(normalizeProductIngredient).filter(Boolean);
  const ingredients = mainIngredients.length > 0 ? mainIngredients : relationIngredients;
  const warnings = normalizeRelation(product.product_warnings);
  const verdictKey = score.verdict_key || "conditional";
  const categorySlug = product.cat || category?.slug || "wellness";
  const categoryName = product.category || category?.name || "Wellness";
  const price = toNumber(product.price);
  const origPrice = toNumber(product.original_price, price);
  const form = product.form || "capsule";
  const diet = product.diet_type || "veg";
  const certifications = normalizeRelation(product.certifications);
  const tags = normalizeRelation(product.tags);
  const scienceScore = toNumber(score.science_score, 60);
  const valueScore = toNumber(score.value_score, 60);
  const safetyScore = toNumber(score.safety_score, 60);
  const parentScore = toNumber(score.parent_score, 60);
  const verdictText = score.verdict_text || "Review the label, ingredients, and warnings before deciding if this product fits your needs.";
  const fssaiVerified = Boolean(product.fssai_verified || product.is_fssai_certified);
  const labTested = Boolean(product.lab_tested || product.is_lab_tested);
  const safeElders = Boolean(product.safe_for_elderly) || parentScore >= 80;
  const chipList = [
    fssaiVerified ? "FSSAI Certified" : null,
    product.ayush_licensed ? "AYUSH Licensed" : null,
    labTested ? "Lab Tested" : null,
    ...certifications,
    ...tags,
    productLabels[diet] || diet,
    safeElders ? "Safe for Elderly" : null,
    valueScore >= 85 ? "Budget Pick" : null,
  ].filter(Boolean);

  return {
    id: product.id,
    name: product.name,
    brand: product.brand || "Unknown Brand",
    price,
    origPrice,
    priceUnit: product.price_unit || product.unit || product.priceUnit || "",
    category: categoryName,
    categoryLabel: categoryName,
    cat: categorySlug,
    subcategory: productLabels[form] || form,
    form,
    formLabel: productLabels[form] || form,
    diet,
    dietLabel: productLabels[diet] || diet,
    rating: toNumber(product.rating),
    reviews: toNumber(product.review_count),
    badges: [
      valueScore >= 85 ? "Budget Pick" : null,
      scienceScore >= 85 ? "Strong Evidence" : null,
      safetyScore >= 85 ? "Safety Pick" : null,
    ].filter(Boolean),
    safeElders,
    safeKids: false,
    fssai: fssaiVerified,
    labTested,
    discounted: origPrice > price,
    verdictKey,
    verdict: score.verdict || product.verdict || productLabels[verdictKey] || "Compare First",
    verdictText,
    verdictColor: verdictColors[verdictKey] || "amber",
    hype: toNumber(score.hype_score, 40),
    moneyAlert: valueScore < 50 ? "medium" : null,
    heartScore: toNumber(score.overall_score, 60),
    scienceScore,
    valueScore,
    safetyScore,
    parentScore,
    productImage: product.product_image_url || product.image_url || product.productImage,
    labelImage: product.label_image_url || product.labelImage,
    imageUrl: product.product_image_url || product.image_url,
    chips: [...new Set(chipList)].slice(0, 8),
    mainIngredients,
    ingredientCards: ingredients.map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount || "",
      color: ["good", "eff", "verified"].includes(ingredient.status) ? "green" : ingredient.status === "warn" ? "amber" : "teal",
      microcopy: ingredient.microcopy || "Declared ingredient",
    })),
    softScores: {
      integrity: safetyScore,
      transparency: toNumber(score.transparency_score, 60),
      research: scienceScore,
      balance: toNumber(score.efficacy_score, 60),
      exposure: 100 - toNumber(score.hype_score, 40),
      value: valueScore,
    },
    quickInterpretation: verdictText,
    researchPanels: {
      ingredientResearch: isRealIngredientText(product.ingredient_research) ? product.ingredient_research : "Ingredients not verified yet",
      consumerTransparency: toNumber(score.transparency_score, 60) >= 70 ? "This product provides relatively clear label information." : "Transparency could improve as more label data becomes available.",
      wellnessContext: "Use this as preventive product guidance, not medical advice.",
      exposureInterpretation: warnings.length > 0 ? "Review cautions before using this product." : "No major warning has been captured in the product database yet.",
      evidenceStrength: scienceScore >= 80 ? "Strong" : scienceScore >= 60 ? "Moderate" : "Limited",
    },
    wellnessMarkers: [],
    transparency: toNumber(score.transparency_score, 60),
    efficacyScore: toNumber(score.efficacy_score, 60),
    hypeScore: toNumber(score.hype_score, 40),
    ingredients: ingredients.map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount || "",
      status: ingredient.status || "und",
    })),
    description: product.description || verdictText,
    usp: product.usp || product.key_explanation || product.description || verdictText,
    practicalTake: verdictText,
    evidence: ingredients.length > 0
      ? "Ingredient evidence levels: " + ingredients.map((ingredient) => ingredient.name + ": " + (ingredient.microcopy || "declared")).join(", ") + "."
      : "Evidence notes are not available for this product yet.",
    threats: warnings.map((warning) => ({
      title: warning.warning_title,
      text: warning.warning_text || "Review this warning before use.",
    })),
    affiliateLink: product.affiliate_url || "#",
  };
};

const getSavedComparisonProductNames = (comparison) => {
  const items = Array.isArray(comparison.items) ? comparison.items : [];
  return items
    .map((item) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      return product?.name;
    })
    .filter(Boolean);
};

const getSavedComparisonProductIds = (comparison) => {
  const items = Array.isArray(comparison.items) ? comparison.items : [];
  return items.map((item) => item.product_id).filter(Boolean);
};

const getSavedComparisonProductSummaries = (comparison, products) => {
  const items = Array.isArray(comparison.items) ? comparison.items : [];

  return items.map((item) => {
    const savedProduct = Array.isArray(item.products) ? item.products[0] : item.products;
    const matchedProduct = products.find((product) => product.id === item.product_id);
    return matchedProduct || savedProduct || { id: item.product_id, name: "Product unavailable" };
  }).filter(Boolean);
};

const formatSavedComparisonDate = (value) => {
  if (!value) return "Recently saved";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently saved";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export const ProductsPage = ({ navigate, initialScanner = false }) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [pricePreset, setPricePreset] = useState("all");
  const [ratingMin, setRatingMin] = useState(0);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedForms, setSelectedForms] = useState([]);
  const [selectedDiets, setSelectedDiets] = useState([]);
  const [selectedVerdicts, setSelectedVerdicts] = useState([]);
  const [safeEldersOnly, setSafeEldersOnly] = useState(false);
  const [fssaiOnly, setFssaiOnly] = useState(false);
  const [discountedOnly, setDiscountedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");
  const [compareList, setCompareList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [familyMode, setFamilyMode] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [savingComparison, setSavingComparison] = useState(false);
  const [comparisonSaveError, setComparisonSaveError] = useState("");
  const [comparisonSaveSuccess, setComparisonSaveSuccess] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [savedComparisons, setSavedComparisons] = useState([]);
  const [loadingSavedComparisons, setLoadingSavedComparisons] = useState(false);
  const [savedComparisonsError, setSavedComparisonsError] = useState("");
  const [deletingComparisonId, setDeletingComparisonId] = useState("");

  useEffect(() => {
    if (initialScanner) setScannerOpen(true);
  }, [initialScanner]);

  useEffect(() => {
    let active = true;

    const loadSavedComparisonsForSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw new Error(error.message);
        }

        const userId = data.session?.user?.id || "";
        if (!active) return;
        setCurrentUserId(userId);

        if (!userId) {
          setSavedComparisons([]);
          return;
        }

        setLoadingSavedComparisons(true);
        setSavedComparisonsError("");

        const response = await fetch(`/api/products/comparisons?user_id=${encodeURIComponent(userId)}`);
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error?.message || "Unable to load saved comparisons right now.");
        }

        if (active) setSavedComparisons(Array.isArray(payload?.data) ? payload.data : []);
      } catch (error) {
        if (active) {
          setSavedComparisons([]);
          setSavedComparisonsError(error instanceof Error ? error.message : "Unable to load saved comparisons right now.");
        }
      } finally {
        if (active) setLoadingSavedComparisons(false);
      }
    };

    loadSavedComparisonsForSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setLoadingProducts(true);
      setProductsError("");

      try {
        const response = await fetch("/api/products");
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error?.message || "Unable to load products right now.");
        }

        const apiProducts = Array.isArray(payload?.data) ? payload.data : [];
        if (active) setProducts(apiProducts.map(mapApiProduct));
      } catch (error) {
        if (active) {
          setProducts([]);
          setProductsError(error instanceof Error ? error.message : "Unable to load products right now.");
        }
      } finally {
        if (active) setLoadingProducts(false);
      }
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const categories = [
    { key: "all", label: "All", icon: "home" },
    ...Array.from(new Map(products.map((product) => [product.cat, { key: product.cat, label: product.category || product.categoryLabel || product.cat, icon: product.cat === "heart" ? "heart" : product.cat === "immunity" ? "shield" : product.cat === "energy" ? "zap" : "activity" }])).values()).filter((cat) => cat.key),
  ];
  const pricePresets = [
    { key: "all", label: "All prices", min: 0, max: Infinity }, { key: "under500", label: "Under Rs 500", min: 0, max: 499 },
    { key: "500to999", label: "Rs 500-999", min: 500, max: 999 }, { key: "1000to1999", label: "Rs 1K-2K", min: 1000, max: 1999 },
    { key: "2000plus", label: "Rs 2K+", min: 2000, max: Infinity },
  ];
  const labelMap = { capsule: "Capsule", softgel: "Softgel", tablet: "Tablet", powder: "Powder/Paste", gummy: "Gummy", veg: "Vegetarian", vegan: "Vegan", nonveg: "Non-Veg", yes: "Worth Buying", conditional: "Conditional", no: "Not Recommended" };
  const brands = [...new Set(products.map(p => p.brand))].sort();
  const forms = Array.from(new Set(products.map(p => p.form).filter(Boolean))).sort();
  const diets = Array.from(new Set(products.map(p => p.diet).filter(Boolean))).sort();
  const verdicts = ["yes", "conditional", "no"];
  const selectedPrice = pricePresets.find(p => p.key === pricePreset) || pricePresets[0];
  const toggleList = (list, setList, value) => setList(list.includes(value) ? list.filter(item => item !== value) : [...list, value]);
  const formatPrice = (product) => "Rs " + product.price + (product.priceUnit || "");
  const filterCount = [category !== "all", pricePreset !== "all", ratingMin > 0, selectedBrands.length, selectedForms.length, selectedDiets.length, selectedVerdicts.length, safeEldersOnly, fssaiOnly, discountedOnly].filter(Boolean).length;
  const clearFilters = () => { setSearch(""); setCategory("all"); setPricePreset("all"); setRatingMin(0); setSelectedBrands([]); setSelectedForms([]); setSelectedDiets([]); setSelectedVerdicts([]); setSafeEldersOnly(false); setFssaiOnly(false); setDiscountedOnly(false); setSortBy("relevance"); };

  const filtered = products.filter(p => {
    const query = search.trim().toLowerCase();
    const haystack = [p.name, p.brand, p.category, p.description].concat((p.ingredients || []).map(i => i.name)).join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (category === "all" || p.cat === category) && p.price >= selectedPrice.min && p.price <= selectedPrice.max && p.rating >= ratingMin &&
      (selectedBrands.length === 0 || selectedBrands.includes(p.brand)) && (selectedForms.length === 0 || selectedForms.includes(p.form)) &&
      (selectedDiets.length === 0 || selectedDiets.includes(p.diet)) && (selectedVerdicts.length === 0 || selectedVerdicts.includes(p.verdictKey)) &&
      (!safeEldersOnly || p.safeElders) && (!fssaiOnly || p.fssai) && (!discountedOnly || p.discounted);
  }).sort((a, b) => {
    if (familyMode) return b.parentScore - a.parentScore;
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "rating-desc") return b.rating - a.rating;
    if (sortBy === "science-desc") return b.scienceScore - a.scienceScore;
    if (sortBy === "reviews-desc") return b.reviews - a.reviews;
    return (b.scienceScore + b.valueScore + b.safetyScore) - (a.scienceScore + a.valueScore + a.safetyScore);
  });

  const toggleCompare = (id) => {
    setComparisonSaveError("");
    setComparisonSaveSuccess("");
    if (compareList.includes(id)) setCompareList(compareList.filter(x => x !== id)); else if (compareList.length < 4) setCompareList([...compareList, id]); else alert("You can compare up to 4 products at once.");
  };
  const compareProducts = products.filter(p => compareList.includes(p.id));
  const loadSavedComparisons = async (userId) => {
    setLoadingSavedComparisons(true);
    setSavedComparisonsError("");

    try {
      const response = await fetch(`/api/products/comparisons?user_id=${encodeURIComponent(userId)}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || "Unable to load saved comparisons right now.");
      }

      setSavedComparisons(Array.isArray(payload?.data) ? payload.data : []);
    } catch (error) {
      setSavedComparisonsError(error instanceof Error ? error.message : "Unable to load saved comparisons right now.");
    } finally {
      setLoadingSavedComparisons(false);
    }
  };
  const viewSavedComparison = (comparison) => {
    const productIds = getSavedComparisonProductIds(comparison);

    if (productIds.length < 2) {
      setSavedComparisonsError("This saved comparison does not have enough products to view.");
      return;
    }

    setCompareList(productIds.slice(0, 4));
    setComparisonSaveError("");
    setComparisonSaveSuccess("");
    setSelectedProduct("compare");
  };
  const deleteSavedComparison = async (comparisonId) => {
    setSavedComparisonsError("");
    setDeletingComparisonId(comparisonId);

    try {
      const response = await fetch(`/api/products/comparisons/${comparisonId}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || "Unable to delete this saved comparison right now.");
      }

      setSavedComparisons(savedComparisons.filter((comparison) => comparison.id !== comparisonId));
    } catch (error) {
      setSavedComparisonsError(error instanceof Error ? error.message : "Unable to delete this saved comparison right now.");
    } finally {
      setDeletingComparisonId("");
    }
  };
  const saveComparison = async () => {
    setComparisonSaveError("");
    setComparisonSaveSuccess("");

    if (compareList.length < 2) {
      setComparisonSaveError("Select at least 2 products to save a comparison.");
      return;
    }

    setSavingComparison(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const userId = sessionData.session?.user?.id;

      if (!userId) {
        setComparisonSaveError("Please log in to save this comparison.");
        return;
      }

      if (!currentUserId) setCurrentUserId(userId);

      const titleProducts = compareProducts.map(product => product.name).slice(0, 3).join(" vs ");
      const title = titleProducts + (compareProducts.length > 3 ? " +" + (compareProducts.length - 3) : "");
      const response = await fetch("/api/products/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          title,
          notes: "",
          product_ids: compareList,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || "Unable to save this comparison right now.");
      }

      setComparisonSaveSuccess("Comparison saved.");
      loadSavedComparisons(userId);
    } catch (error) {
      setComparisonSaveError(error instanceof Error ? error.message : "Unable to save this comparison right now.");
    } finally {
      setSavingComparison(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream pb-28 slide-up">
      <section className="relative overflow-hidden mesh-warm noise border-b border-ink/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 relative">
          <div className="max-w-5xl">
            <div>
              <Badge color="teal">SwasthyaSathi</Badge>
              <h1 className="serif text-4xl sm:text-5xl lg:text-6xl font-medium text-ink mt-4 mb-4 leading-tight">SwasthyaSathi Product Comparison</h1>
              <p className="text-ink/65 text-lg leading-relaxed max-w-2xl">Compare health products by evidence, value, safety, transparency, and family suitability before you buy.</p>
              <div className="mt-7 space-y-4">
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-ink/10 bg-white/80 focus:border-aqua-deep focus:ring-2 focus:ring-aqua/20 outline-none transition-all text-ink" placeholder="Search supplements, brands, ingredients..." />
                  </div>
                  <Button variant="outline" icon="camera" onClick={() => setScannerOpen(true)}>Scan Label</Button>
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-cream-warm px-4 py-2.5">
                    <span className="text-sm font-medium text-ink/65">Family mode</span>
                    <button aria-label="Toggle family mode" onClick={() => setFamilyMode(!familyMode)} className={(familyMode ? "bg-aqua-deep" : "bg-ink/20") + " relative h-6 w-12 rounded-full transition-colors"}>
                      <span className={(familyMode ? "translate-x-6" : "translate-x-0.5") + " absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm"} />
                    </button>
                  </div>
                </div>
                <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {categories.map(cat => <button key={cat.key} onClick={() => setCategory(cat.key)} className={(category === cat.key ? "bg-ink text-cream" : "bg-white/80 text-ink/65 border border-ink/10 hover:bg-aqua-light") + " flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"}><Icon name={cat.icon} size={15} />{cat.label}</button>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {familyMode && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-terracotta/40 bg-terracotta-soft/70 p-4"><Icon name="users" size={20} className="text-terracotta-deep mt-0.5" /><p className="text-sm text-ink/75"><strong className="text-ink">Family mode ON:</strong> products are sorted by family suitability and older-adult cautions are highlighted.</p></div>}

        {currentUserId && <section className="mb-6 rounded-3xl bg-white border border-ink/8 shadow-glass p-5"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"><div><h2 className="serif text-2xl font-medium text-ink">Saved comparisons</h2><p className="text-sm text-ink/55">Reopen or remove product comparisons saved to your account.</p></div><Button variant="outline" size="sm" disabled={loadingSavedComparisons} onClick={() => loadSavedComparisons(currentUserId)}>{loadingSavedComparisons ? "Loading..." : "Refresh"}</Button></div>{savedComparisonsError && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-3 mb-3">{savedComparisonsError}</div>}{loadingSavedComparisons ? <div className="text-sm text-ink/55">Loading saved comparisons...</div> : savedComparisons.length === 0 ? <div className="text-sm text-ink/55">No saved comparisons yet. Select two or more products and save your comparison.</div> : <div className="grid md:grid-cols-2 gap-3">{savedComparisons.map((comparison) => { const productSummaries = getSavedComparisonProductSummaries(comparison, products); return <div key={comparison.id} className="rounded-2xl border border-ink/8 bg-cream-warm/70 p-4"><div className="flex items-start justify-between gap-3 mb-3"><div><h3 className="font-semibold text-ink text-sm">{comparison.title || "Saved comparison"}</h3><p className="text-xs text-ink/40">{formatSavedComparisonDate(comparison.created_at)}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => viewSavedComparison(comparison)}>View</Button><Button variant="ghost" size="sm" disabled={deletingComparisonId === comparison.id} onClick={() => deleteSavedComparison(comparison.id)}>{deletingComparisonId === comparison.id ? "Deleting..." : "Delete"}</Button></div></div><div className="space-y-2">{productSummaries.length > 0 ? productSummaries.map((product) => { const scores = getProductScores(product); const summaryScore = Math.round((Number(scores[0].value || 0) + Number(scores[1].value || 0) + Number(scores[2].value || 0)) / 3); return <div key={product.id || product.name} className="rounded-xl bg-white/75 border border-ink/5 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-ink">{product.name || "Product unavailable"}</p><p className="text-xs text-ink/45">{product.brand || "Brand not listed"}</p></div>{product.verdict && <Badge color={product.verdictColor || "amber"}>{getProductVerdict(product)}</Badge>}</div><div className="mt-2 grid grid-cols-3 gap-2">{scores.slice(0, 3).map((score) => <div key={score.label}><div className="h-1 rounded-full bg-ink/10 overflow-hidden"><div className="h-full rounded-full bg-aqua-deep" style={{ width: `${Math.max(0, Math.min(100, Number(score.value) || 0))}%` }} /></div><p className="mt-1 text-[10px] text-ink/45">{score.label}</p></div>)}</div><p className="mt-2 text-[11px] text-ink/45">Core score: {Number.isFinite(summaryScore) ? summaryScore : "Not listed"}</p></div>; }) : <p className="text-sm text-ink/55">Products unavailable</p>}</div></div>; })}</div>}</section>}

        <div className="grid lg:grid-cols-[292px_1fr] gap-6 items-start">
          <aside className="lg:sticky lg:top-24 space-y-4">
            <div className="rounded-3xl bg-white border border-ink/8 shadow-glass overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-ink/8">
                <div>
                  <h3 className="font-semibold text-ink flex items-center gap-2"><Icon name="tool" size={18} />Filters</h3>
                  <p className="text-xs text-ink/40 mt-0.5">{filterCount > 0 ? filterCount + " active" : "Compact controls"}</p>
                </div>
                <button onClick={clearFilters} className="text-sm font-medium text-aqua-deep hover:text-ink transition-colors">Clear</button>
              </div>
              <div className="p-3 space-y-2">
                <details open className="group rounded-2xl border border-ink/8 bg-cream-cold">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-ink">Price & rating <Icon name="chevronDown" size={16} className="transition-transform group-open:rotate-180" /></summary>
                  <div className="px-4 pb-4 space-y-4">
                    <div className="grid grid-cols-2 gap-2">{pricePresets.map(preset => <button key={preset.key} onClick={() => setPricePreset(preset.key)} className={(pricePreset === preset.key ? "bg-ink text-cream border-ink" : "bg-white text-ink/65 border-ink/10 hover:bg-aqua-light") + " px-3 py-2 rounded-xl text-xs font-medium border transition-colors"}>{preset.label}</button>)}</div>
                    <div className="grid gap-2">{[4, 3, 0].map(rating => <button key={rating} onClick={() => setRatingMin(rating)} className={(ratingMin === rating ? "bg-aqua-light text-aqua-deep" : "bg-white hover:bg-cream-warm text-ink/60") + " w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm"}><span>{rating === 0 ? "All ratings" : rating + "+ stars"}</span><Icon name={ratingMin === rating ? "check" : "star"} size={14} /></button>)}</div>
                  </div>
                </details>

                <details className="group rounded-2xl border border-ink/8 bg-cream-cold">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-ink">Brand {selectedBrands.length > 0 && <span className="ml-2 rounded-full bg-aqua-light px-2 py-0.5 text-[11px] text-aqua-deep">{selectedBrands.length}</span>}<Icon name="chevronDown" size={16} className="transition-transform group-open:rotate-180" /></summary>
                  <div className="max-h-56 overflow-y-auto px-4 pb-4 space-y-2">{brands.map(brand => <label key={brand} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm text-ink/65 cursor-pointer"><span className="flex items-center gap-2 min-w-0"><input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleList(selectedBrands, setSelectedBrands, brand)} /><span className="truncate">{brand}</span></span><span className="text-xs text-ink/35">{products.filter(p => p.brand === brand).length}</span></label>)}</div>
                </details>

                <details className="group rounded-2xl border border-ink/8 bg-cream-cold">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-ink">Format {selectedForms.length > 0 && <span className="ml-2 rounded-full bg-aqua-light px-2 py-0.5 text-[11px] text-aqua-deep">{selectedForms.length}</span>}<Icon name="chevronDown" size={16} className="transition-transform group-open:rotate-180" /></summary>
                  <div className="max-h-48 overflow-y-auto px-4 pb-4 space-y-2">{forms.map(form => <label key={form} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm text-ink/65 cursor-pointer"><span className="flex items-center gap-2"><input type="checkbox" checked={selectedForms.includes(form)} onChange={() => toggleList(selectedForms, setSelectedForms, form)} />{labelMap[form] || String(form).replace(/-/g, " ")}</span><span className="text-xs text-ink/35">{products.filter(p => p.form === form).length}</span></label>)}</div>
                </details>

                <details className="group rounded-2xl border border-ink/8 bg-cream-cold">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-ink">Diet & verdict <Icon name="chevronDown" size={16} className="transition-transform group-open:rotate-180" /></summary>
                  <div className="px-4 pb-4 space-y-4">
                    {diets.length > 0 && <div className="space-y-2">{diets.map(diet => <label key={diet} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm text-ink/65 cursor-pointer"><span className="flex items-center gap-2"><input type="checkbox" checked={selectedDiets.includes(diet)} onChange={() => toggleList(selectedDiets, setSelectedDiets, diet)} />{labelMap[diet] || String(diet).replace(/-/g, " ")}</span><span className="text-xs text-ink/35">{products.filter(p => p.diet === diet).length}</span></label>)}</div>}
                    <div className="space-y-2">{verdicts.map(verdict => <label key={verdict} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm text-ink/65 cursor-pointer"><span className="flex items-center gap-2"><input type="checkbox" checked={selectedVerdicts.includes(verdict)} onChange={() => toggleList(selectedVerdicts, setSelectedVerdicts, verdict)} />{labelMap[verdict]}</span><span className="text-xs text-ink/35">{products.filter(p => p.verdictKey === verdict).length}</span></label>)}</div>
                  </div>
                </details>

                <details className="group rounded-2xl border border-ink/8 bg-cream-cold">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-ink">Special <Icon name="chevronDown" size={16} className="transition-transform group-open:rotate-180" /></summary>
                  <div className="px-4 pb-4 space-y-3">{[{ label: "Safe for Elderly", value: safeEldersOnly, set: setSafeEldersOnly }, { label: "FSSAI Certified", value: fssaiOnly, set: setFssaiOnly }, { label: "Discounted Only", value: discountedOnly, set: setDiscountedOnly }].map(item => <div key={item.label} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-ink/65"><span>{item.label}</span><button aria-pressed={item.value} aria-label={item.label} onClick={() => item.set(!item.value)} className={(item.value ? "bg-aqua-deep" : "bg-ink/20") + " w-11 h-6 rounded-full transition-colors relative"}><span className={(item.value ? "translate-x-5" : "translate-x-0.5") + " w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform"} /></button></div>)}</div>
                </details>
              </div>
            </div>
          </aside>

          <main>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><p className="text-sm text-ink/55">Showing <strong className="text-ink">{filtered.length}</strong> of <strong className="text-ink">{products.length}</strong> products{filterCount > 0 && " with " + filterCount + " filter" + (filterCount > 1 ? "s" : "")}</p><select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-4 py-2 rounded-xl border border-ink/10 text-sm text-ink/65 bg-white outline-none focus:border-aqua-deep"><option value="relevance">Sort: Relevance</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option><option value="rating-desc">Rating: High to Low</option><option value="science-desc">Science Confidence</option><option value="reviews-desc">Most Reviewed</option></select></div>
            {loadingProducts && <div className="rounded-3xl bg-white border border-ink/8 shadow-glass text-center py-14"><Icon name="activity" size={32} className="text-ink/25 mx-auto mb-3" /><h3 className="font-semibold text-ink mb-2">Loading products</h3><p className="text-sm text-ink/55">Fetching the latest product comparisons.</p></div>}
            {!loadingProducts && productsError && <div className="rounded-3xl bg-white border border-ink/8 shadow-glass text-center py-14"><Icon name="alertTriangle" size={32} className="text-terracotta-deep mx-auto mb-3" /><h3 className="font-semibold text-ink mb-2">Could not load products</h3><p className="text-sm text-ink/55 mb-4">{productsError}</p><Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button></div>}
            {!loadingProducts && !productsError && (filtered.length === 0 ? <div className="rounded-3xl bg-white border border-ink/8 shadow-glass text-center py-14"><Icon name="search" size={32} className="text-ink/25 mx-auto mb-3" /><h3 className="font-semibold text-ink mb-2">No products match your filters</h3><p className="text-sm text-ink/55 mb-4">Try adjusting your filters or search term.</p><Button variant="outline" onClick={clearFilters}>Clear Filters</Button></div> : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">{filtered.map(product => <ProductCardV2 key={product.id} product={product} onDetails={() => setSelectedProduct(product)} onCompare={() => toggleCompare(product.id)} inCompare={compareList.includes(product.id)} familyMode={familyMode} />)}</div>)}
          </main>
        </div>
      </div>

      {compareList.length > 0 && <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-ink/10 p-4 shadow-lift z-30 safe-bottom"><div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-ink">{compareList.length} selected</span>{compareProducts.map(p => <div key={p.id} className="flex items-center gap-1 bg-cream-warm rounded-full px-3 py-1.5 text-xs text-ink/65">{p.name.substring(0, 20)}<button aria-label={'Remove ' + p.name} onClick={() => toggleCompare(p.id)}><Icon name="x" size={12} /></button></div>)}{comparisonSaveError && <span className="text-xs text-red-600">{comparisonSaveError}</span>}{comparisonSaveSuccess && <span className="text-xs text-green-600">{comparisonSaveSuccess}</span>}</div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => { setCompareList([]); setComparisonSaveError(""); setComparisonSaveSuccess(""); }}>Clear</Button>{compareList.length >= 2 && <Button variant="outline" size="sm" disabled={savingComparison} onClick={saveComparison}>{savingComparison ? "Saving..." : "Save Comparison"}</Button>}<Button variant="primary" size="sm" onClick={() => compareList.length >= 2 ? setSelectedProduct("compare") : alert("Select at least 2 products to compare.")}>Compare selected</Button></div></div></div>}

      <ScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />
      <Modal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} size="xl" title={selectedProduct === "compare" ? "Product Comparison" : undefined}>
        {selectedProduct === "compare" ? <ProductComparisonPanel products={compareProducts} formatPrice={formatPrice} /> : selectedProduct && <ProductDetailV2 product={selectedProduct} navigate={navigate} />}
      </Modal>
    </div>
  );
};
