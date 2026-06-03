"use client";

import React, { useId, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Icon } from "@/components/ui/Icon";

const STATUS = {
  green: { bg: "#E9F7EF", text: "#166534", dot: "#16A34A", label: "Strong" },
  amber: { bg: "#FFF3E8", text: "#9A5A2E", dot: "#C97A5E", label: "Context dependent" },
  red: { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626", label: "Worth attention" },
  teal: { bg: "#E8F7F5", text: "#0E7C7B", dot: "#13A8A5", label: "Transparent" },
};

const THEMES = {
  heart: { name: "Heart", icon: "heart", primary: "#0E7C7B", deep: "#0B2545", mid: "#A8E0DC", soft: "#E6F4F2", tint: "#ECF8F6", grad: ["#F5FFFD", "#A8E0DC"] },
  immunity: { name: "Immunity", icon: "shield", primary: "#0E7C7B", deep: "#123B2B", mid: "#B8E2C8", soft: "#F1FAF4", tint: "#F1FAF4", grad: ["#F7FFF9", "#B8E2C8"] },
  bone: { name: "Bone", icon: "activity", primary: "#2E5077", deep: "#0B2545", mid: "#CBD8EA", soft: "#F4F7FB", tint: "#F4F7FB", grad: ["#FBFCFF", "#CBD8EA"] },
  brain: { name: "Brain", icon: "activity", primary: "#5E6E9E", deep: "#1B365D", mid: "#CCD4EF", soft: "#F5F6FC", tint: "#F5F6FC", grad: ["#FBFAFF", "#CCD4EF"] },
  energy: { name: "Energy", icon: "zap", primary: "#C97A5E", deep: "#643323", mid: "#E8B4A0", soft: "#FFF4EE", tint: "#FFF4EE", grad: ["#FFF8F2", "#E8B4A0"] },
  fitness: { name: "Fitness", icon: "activity", primary: "#0E7C7B", deep: "#123B2B", mid: "#B8E2C8", soft: "#F2FAF5", tint: "#F2FAF5", grad: ["#F8FFF9", "#B8E2C8"] },
  hydration: { name: "Hydration", icon: "activity", primary: "#13A8A5", deep: "#0B2545", mid: "#A8E0DC", soft: "#EEF9F8", tint: "#EEF9F8", grad: ["#F6FFFF", "#A8E0DC"] },
  digestion: { name: "Digestion", icon: "activity", primary: "#7A9B58", deep: "#2F4A2D", mid: "#D3E4C2", soft: "#F6FAF0", tint: "#F6FAF0", grad: ["#FCFFF7", "#D3E4C2"] },
  nutrition: { name: "Nutrition", icon: "activity", primary: "#0E7C7B", deep: "#123B2B", mid: "#B8E2C8", soft: "#F2FAF5", tint: "#F2FAF5", grad: ["#F8FFF9", "#B8E2C8"] },
  device: { name: "Device", icon: "activity", primary: "#2E5077", deep: "#0B2545", mid: "#CBD8EA", soft: "#F4F7FB", tint: "#F4F7FB", grad: ["#FBFCFF", "#CBD8EA"] },
  ayurveda: { name: "Ayurveda", icon: "activity", primary: "#7A9B58", deep: "#2F4A2D", mid: "#D3E4C2", soft: "#F6FAF0", tint: "#F6FAF0", grad: ["#FCFFF7", "#D3E4C2"] },
  supplement: { name: "Supplement", icon: "activity", primary: "#0E7C7B", deep: "#0B2545", mid: "#A8E0DC", soft: "#E6F4F2", tint: "#ECF8F6", grad: ["#F5FFFD", "#A8E0DC"] },
  "personal-care": { name: "Personal Care", icon: "user", primary: "#C97A5E", deep: "#643323", mid: "#E8B4A0", soft: "#FFF4EE", tint: "#FFF4EE", grad: ["#FFF8F2", "#E8B4A0"] },
  "baby-care": { name: "Baby Care", icon: "user", primary: "#5E6E9E", deep: "#1B365D", mid: "#CCD4EF", soft: "#F5F6FC", tint: "#F5F6FC", grad: ["#FBFAFF", "#CCD4EF"] },
  wellness: { name: "Wellness", icon: "activity", primary: "#0E7C7B", deep: "#0B2545", mid: "#A8E0DC", soft: "#E6F4F2", tint: "#FAF7F0", grad: ["#FFFCF6", "#A8E0DC"] },
  default: { name: "Wellness", icon: "activity", primary: "#0E7C7B", deep: "#0B2545", mid: "#A8E0DC", soft: "#E6F4F2", tint: "#FAF7F0", grad: ["#FFFCF6", "#A8E0DC"] },
};

const themeFor = (cat?: string) => THEMES[cat || ""] || THEMES.default;
const statusFor = (color?: string) => STATUS[color || ""] || STATUS.amber;
const clampScore = (score?: number) => Math.max(0, Math.min(100, Number(score) || 0));
const isRenderableProductImage = (src?: string) => {
  if (!src) return false;
  const lower = src.toLowerCase();
  return lower.startsWith("http") && !lower.includes("google.com/search") && !lower.includes("tbm=isch");
};

export const getProductCategoryLabel = (product: any) => product.categoryLabel || product.category || "Not listed";
export const getProductFormLabel = (product: any) => product.formLabel || product.subcategory || product.form || "Not listed";
export const getProductVerdict = (product: any) => product.verdict || "Compare First";
export const getProductPrice = (product: any) => {
  const price = Number(product.price);
  const original = Number(product.originalPrice ?? product.origPrice ?? product.original_price);
  const unit = product.priceUnit || "";
  const priceText = Number.isFinite(price) && price > 0 ? `Rs ${price}${unit}` : "Price not listed";
  const originalText = Number.isFinite(original) && original > price ? `Rs ${original}${unit}` : "";
  return { priceText, originalText, discounted: Boolean(originalText) };
};
export const getProductUSP = (product: any) => {
  if (typeof product.usp === "string") return product.usp;
  return product.usp?.context || product.practicalTake || product.quickInterpretation || product.interpretation || product.description || product.verdictText || "Evidence not available.";
};
export const getProductScores = (product: any) => [
  { label: "Science", key: "science", value: product.scores?.science ?? product.scienceScore, color: "#0E7C7B" },
  { label: "Value", key: "value", value: product.scores?.value ?? product.valueScore, color: "#16A34A" },
  { label: "Safety", key: "safety", value: product.scores?.safety ?? product.safetyScore, color: Number(product.scores?.safety ?? product.safetyScore) < 60 ? "#C97A5E" : "#0E7C7B" },
  { label: "Efficacy", key: "efficacy", value: product.scores?.efficacy ?? product.efficacyScore, color: "#0E7C7B" },
  { label: "Transparency", key: "transparency", value: product.scores?.transparency ?? product.transparency, color: "#2E5077" },
  { label: "Family Safety", key: "familySafety", value: product.scores?.familySafety ?? product.parentScore, color: Number(product.scores?.familySafety ?? product.parentScore) < 60 ? "#C97A5E" : "#0E7C7B" },
];
export const getProductChips = (product: any) => Array.from(new Set([
  ...(Array.isArray(product.chips) ? product.chips : []),
  ...(Array.isArray(product.certifications) ? product.certifications : []),
  product.fssai ? "FSSAI Certified" : null,
  product.labTested ? "Lab Tested" : null,
  product.dietLabel,
  product.safeElders ? "Safe for Elderly" : null,
].filter(Boolean).map(String)));

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

const getIngredientCards = (product: any) => {
  const mainIngredients = Array.isArray(product.mainIngredients) ? product.mainIngredients : [];
  if (mainIngredients.length > 0) {
    return mainIngredients
      .filter((ing: any) => isRealIngredientText(ing.name || ing.ingredient_name))
      .map((ing: any) => ({
        name: ing.name || ing.ingredient_name,
        amount: isRealIngredientText(ing.amount) ? ing.amount : "",
        type: ing.type || ing.part_used || "Ingredient",
        color: ing.color || "green",
        microcopy: ing.microcopy || [ing.scientific_name, ing.part_used].filter(isRealIngredientText).join(" / ") || "Verified ingredient",
      }));
  }
  if (Array.isArray(product.ingredientCards) && product.ingredientCards.length > 0) {
    return product.ingredientCards.filter((ing: any) => isRealIngredientText(ing.name));
  }
  const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
  return ingredients.length > 0
    ? ingredients.filter((ing: any) => isRealIngredientText(ing.name || ing.ingredient_name)).map((ing: any) => ({
        name: ing.name || ing.ingredient_name || "Ingredient",
        amount: isRealIngredientText(ing.amount) ? ing.amount : "",
        type: ing.type || ing.ingredientType || "Ingredient",
        color: ["good", "eff"].includes(ing.status) ? "green" : ["warn", "con"].includes(ing.status) ? "amber" : "teal",
        microcopy: ing.microcopy || ing.evidenceLevel || ing.evidence_level || "Declared ingredient",
      }))
    : [];
};

const ScoreBar = ({ label, score, color = "#0E7C7B" }: { label: string; score?: number; color?: string }) => (
  <div>
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-ink/50">{label}</span>
      <span className="text-xs font-bold text-ink">{clampScore(score)}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
      <div className="h-full rounded-full" style={{ width: `${clampScore(score)}%`, background: color }} />
    </div>
  </div>
);

const BrandProductSVG = ({ product, theme }: { product: any; theme: any }) => {
  const reactId = useId().replace(/:/g, "");
  const id = `product-${reactId}-${String(product.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const brand = (product.brand || "SwasthyaSathi").length > 16 ? `${product.brand.slice(0, 15)}.` : product.brand || "SwasthyaSathi";
  const form = String(product.form || "").toLowerCase();
  const kind = form.includes("powder") ? "jar" : form.includes("tablet") ? "blister" : "bottle";

  return (
    <svg viewBox="0 0 360 360" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={theme.grad[0]} /><stop offset="1" stopColor={theme.grad[1]} /></linearGradient>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={theme.deep} /><stop offset="0.45" stopColor={theme.primary} /><stop offset="1" stopColor={theme.deep} /></linearGradient>
      </defs>
      <rect width="360" height="360" fill={`url(#${id}-bg)`} />
      <circle cx="180" cy="145" r="120" fill="#FFFFFF" opacity="0.16" />
      <ellipse cx="180" cy="318" rx="96" ry="18" fill="#0B2545" opacity="0.13" />
      {kind === "jar" ? (
        <g>
          <rect x="106" y="108" width="148" height="42" rx="13" fill={theme.deep} />
          <rect x="116" y="146" width="128" height="160" rx="20" fill={`url(#${id}-body)`} />
          <rect x="126" y="182" width="108" height="106" rx="7" fill="#FBF9F4" />
          <text x="180" y="219" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="14" fontWeight="600" fill={theme.deep}>{brand}</text>
          <text x="180" y="242" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontSize="7" letterSpacing="1.5" fill={theme.primary}>{theme.name.toUpperCase()}</text>
        </g>
      ) : kind === "blister" ? (
        <g>
          <rect x="116" y="116" width="128" height="178" rx="13" fill={`url(#${id}-body)`} />
          <rect x="116" y="116" width="128" height="36" rx="13" fill={theme.deep} />
          <text x="180" y="139" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="12" fontWeight="600" fill="#fff">{brand}</text>
          {[0, 1, 2].map((r) => [0, 1].map((c) => <circle key={`${r}-${c}`} cx={152 + c * 56} cy={178 + r * 42} r="19" fill="#FBF9F4" opacity="0.96" />))}
        </g>
      ) : (
        <g>
          <rect x="148" y="78" width="64" height="46" rx="9" fill={theme.deep} />
          <rect x="144" y="119" width="72" height="13" rx="4" fill={theme.deep} />
          <rect x="130" y="127" width="100" height="184" rx="22" fill={`url(#${id}-body)`} />
          <rect x="138" y="181" width="84" height="101" rx="6" fill="#FBF9F4" />
          <text x="180" y="213" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="13" fontWeight="600" fill={theme.deep}>{brand}</text>
          <text x="180" y="235" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontSize="7" letterSpacing="1.5" fill={theme.primary}>{theme.name.toUpperCase()}</text>
        </g>
      )}
      <text x="180" y="344" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontSize="7" letterSpacing="1" fill={theme.deep} opacity="0.45">ILLUSTRATED REPRESENTATION</text>
    </svg>
  );
};

const ProductImage = ({ product, theme, className = "" }: { product: any; theme: any; className?: string }) => {
  const [failed, setFailed] = useState(false);
  const src = product.productImage || product.imageUrl || product.image_url;

  if (isRenderableProductImage(src) && !failed) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-white/65 p-4 ${className}`}>
        <img src={src} alt={product.name} className="max-h-full max-w-full object-contain" onError={() => setFailed(true)} />
      </div>
    );
  }

  return <BrandProductSVG product={product} theme={theme} />;
};

const StylizedLabel = ({ product, theme }: { product: any; theme: any }) => {
  const ingredients = getIngredientCards(product);
  return (
    <div className="flex h-full w-full flex-col rounded-2xl border bg-white p-5 font-mono" style={{ borderColor: theme.mid }}>
      <div className="border-b-2 pb-2 text-center" style={{ borderColor: theme.primary }}>
        <p className="serif text-base font-bold" style={{ color: theme.deep }}>{product.brand}</p>
        <p className="mt-0.5 text-[10px] text-ink/55">{product.name}</p>
      </div>
      <div className="border-b border-ink/10 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.deep }}>Supplement facts</p>
        <p className="mt-0.5 text-[9px] text-ink/50">Serving size: 1 {String(getProductFormLabel(product)).toLowerCase()}</p>
      </div>
      <div className="flex-1 overflow-y-auto py-2.5 text-[10px]">
        <div className="mb-1 flex justify-between border-b border-ink/10 pb-1 font-bold text-ink"><span>Ingredient</span><span>Amount</span></div>
        {ingredients.length > 0 ? ingredients.map((ing: any, index: number) => (
          <div key={`${ing.name}-${index}`} className="flex justify-between border-b border-ink/5 py-1.5 text-ink/80">
            <span className="pr-2 leading-tight">{ing.name}</span>
            <span className="whitespace-nowrap font-bold" style={{ color: theme.deep }}>{ing.amount}</span>
          </div>
        )) : <p className="py-3 text-ink/55">Ingredients not verified yet</p>}
      </div>
      <div className="border-t-2 pt-2 text-[8.5px] leading-snug text-ink/50" style={{ borderColor: theme.primary }}>
        <p>{getProductChips(product).slice(0, 2).join(" / ")}</p>
        <p className="mt-0.5">Interpreted label preview / actual packaging may differ</p>
      </div>
    </div>
  );
};

const ProductHero = ({ product, theme }: { product: any; theme: any }) => {
  const [slide, setSlide] = useState(0);
  const labels = ["Product", "Label", "Inside"];
  const ingredients = getIngredientCards(product);
  const go = (direction: number) => setSlide((slide + direction + 3) % 3);

  return (
    <div>
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-glass" style={{ background: `linear-gradient(150deg, ${theme.grad[0]}, ${theme.grad[1]})` }}>
        {slide === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <ProductImage product={product} theme={theme} className="p-6" />
            <div className="absolute left-4 top-4 flex max-w-[75%] flex-wrap gap-1.5">
              {getProductChips(product).slice(0, 4).map((chip) => <span key={chip} className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: theme.deep }}>{chip}</span>)}
            </div>
          </div>
        )}
        {slide === 1 && <div className="absolute inset-0 flex items-center justify-center p-5"><StylizedLabel product={product} theme={theme} /></div>}
        {slide === 2 && (
          <div className="absolute inset-0 overflow-y-auto p-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.deep }}>Ingredient interpretation</p>
            {ingredients.length > 0 ? <div className="space-y-2">
              {ingredients.map((ing: any, index: number) => {
                const status = statusFor(ing.color);
                return <div key={`${ing.name}-${index}`} className="rounded-xl bg-white/85 p-3"><div className="flex items-start justify-between gap-2"><p className="text-[12.5px] font-semibold leading-tight text-ink">{ing.name}</p><span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: status.dot }} /></div><p className="mt-1 text-[11px]" style={{ color: status.text }}>{ing.microcopy}</p></div>;
              })}
            </div> : <div className="rounded-xl bg-white/85 p-3 text-sm text-ink/60">Ingredients not verified yet</div>}
          </div>
        )}
        <button onClick={() => go(-1)} aria-label="Previous product view" className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 transition-colors hover:bg-white" style={{ color: theme.deep }}><Icon name="chevronLeft" size={16} /></button>
        <button onClick={() => go(1)} aria-label="Next product view" className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 transition-colors hover:bg-white" style={{ color: theme.deep }}><Icon name="chevronRight" size={16} /></button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1"><p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.deep }}>{labels[slide]}</p></div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        {[0, 1, 2].map((item) => <button key={item} onClick={() => setSlide(item)} aria-label={`Show ${labels[item]}`} className="rounded-full transition-all" style={item === slide ? { width: 24, height: 6, background: theme.primary } : { width: 6, height: 6, background: "rgba(11,37,69,0.18)" }} />)}
      </div>
    </div>
  );
};

const USPBanner = ({ product, theme }: { product: any; theme: any }) => {
  const headline = typeof product.usp === "object" ? product.usp?.headline : getProductVerdict(product);
  const context = getProductUSP(product);

  return (
    <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: `linear-gradient(120deg, ${theme.primary} 0%, ${theme.deep} 100%)` }}>
      <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
      <div className="relative flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20"><Icon name="star" size={19} className="text-white" /></div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">What makes this stand out</p>
          <p className="serif text-xl font-medium leading-tight text-white">{headline || getProductVerdict(product)}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/85">{context}</p>
        </div>
      </div>
    </div>
  );
};

const IngredientMicroCard = ({ ingredient }: { ingredient: any }) => {
  const status = statusFor(ingredient.color);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink/8 bg-white p-4">
      <div className="absolute bottom-0 left-0 top-0 w-1" style={{ background: status.dot }} />
      <div className="mb-1.5 flex items-start justify-between gap-2 pl-1.5">
        <p className="text-[14px] font-semibold leading-snug text-ink">{ingredient.name}</p>
        <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: status.bg, color: status.text }}>{status.label}</span>
      </div>
      <p className="mb-1.5 pl-1.5 text-[10px] font-medium uppercase tracking-widest text-ink/45">{ingredient.type || "Ingredient"} / {ingredient.amount || "Not listed"}</p>
      <p className="pl-1.5 text-[12px] text-ink/70">{ingredient.microcopy}</p>
    </div>
  );
};

const ResearchAngleCard = ({ title, body, icon, theme, badge }: { title: string; body: string; icon: string; theme: any; badge?: string }) => (
  <div className="flex h-full flex-col rounded-2xl border border-ink/8 bg-white p-5">
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: theme.soft, color: theme.deep }}><Icon name={icon} size={15} /></div>
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: theme.deep }}>{title}</p>
    </div>
    <p className="flex-1 text-[13px] leading-relaxed text-ink/75">{body}</p>
    {badge && <div className="mt-3 border-t border-ink/8 pt-3"><span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: theme.soft, color: theme.deep }}>{badge}</span></div>}
  </div>
);

export const ProductCardV2 = ({ product, onDetails, onCompare, inCompare, familyMode }: any) => {
  const theme = themeFor(product.cat || product.categorySlug);
  const verdict = statusFor(product.verdictColor === "green" ? "green" : product.verdictColor === "red" ? "red" : "amber");
  const price = getProductPrice(product);
  const ingredients = getIngredientCards(product);
  const primaryIngredient = ingredients[0];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink/8 bg-white shadow-glass transition-shadow hover:shadow-lift">
      <div className="h-1" style={{ background: theme.primary }} />
      <div className="aspect-[4/3] overflow-hidden" style={{ background: `linear-gradient(150deg, ${theme.grad[0]}, ${theme.grad[1]})` }}>
        <ProductImage product={product} theme={theme} />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink/40">{getProductCategoryLabel(product)}</p>
          <span className="inline-flex items-center gap-1 text-[10px] text-ink/45">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: verdict.dot }} />
            {getProductVerdict(product)}
          </span>
        </div>
        <h3 className="serif mb-1 text-[17px] font-medium leading-snug text-ink">{product.name}</h3>
        <p className="mb-3 text-xs text-ink/45">{product.brand}</p>
        <div className="mb-3 rounded-xl p-3" style={{ background: theme.tint }}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: theme.deep }}>What's inside - {ingredients.length}</p>
          {primaryIngredient ? <div className="flex items-center gap-2 text-[12px] text-ink/75">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: statusFor(primaryIngredient?.color).dot }} />
            <span className="leading-tight">{primaryIngredient?.name || "Ingredient not listed"}</span>
          </div> : <p className="text-[12px] text-ink/55">Ingredients not verified yet</p>}
          {ingredients.length > 1 && <p className="mt-1 pl-3.5 text-[11px] text-ink/40">+{ingredients.length - 1} more</p>}
        </div>
        {familyMode && <p className="mb-3 text-[11px]" style={{ color: product.safeElders ? STATUS.green.text : STATUS.amber.text }}>{product.safeElders ? "Suitable for older adults" : "Review family suitability before buying"}</p>}
        <div className="mt-auto flex items-center justify-between border-t border-ink/8 pt-3 text-[11px]">
          <span className="text-ink/65"><span className="font-semibold text-ink">{price.priceText}</span></span>
          <span className="text-ink/40">{product.rating || "Not listed"} star - {Number(product.reviewCount ?? product.reviews ?? 0).toLocaleString()}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={onDetails} className="min-h-10 flex-1 cursor-pointer rounded-lg border py-2 text-[13px] font-semibold transition-colors hover:bg-cream-warm" style={{ borderColor: theme.mid, color: theme.deep }}>View details</button>
          <button onClick={onCompare} className="min-h-10 cursor-pointer rounded-lg px-3 py-2 text-[13px] font-medium transition-colors" style={inCompare ? { background: theme.primary, color: "#fff" } : { background: "rgba(11,37,69,0.05)", color: "#0B2545" }}>{inCompare ? "Added" : "Compare"}</button>
        </div>
      </div>
    </article>
  );
};

export const ProductDetailV2 = ({ product, navigate }: any) => {
  const theme = themeFor(product.cat || product.categorySlug);
  const verdict = statusFor(product.verdictColor === "green" ? "green" : product.verdictColor === "red" ? "red" : "amber");
  const price = getProductPrice(product);
  const scores = getProductScores(product);
  const ingredients = getIngredientCards(product);
  const chips = getProductChips(product);
  const warnings = Array.isArray(product.warnings) ? product.warnings : Array.isArray(product.threats) ? product.threats : [];

  return (
    <div className="-m-6 space-y-7 rounded-2xl p-6" style={{ background: theme.tint }}>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: theme.primary }}><Icon name={theme.icon} size={12} />{theme.name}</span>
        <span className="text-[12px] text-ink/45">{getProductCategoryLabel(product)} / {getProductFormLabel(product)}</span>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
        <ProductHero product={product} theme={theme} />
        <div className="flex flex-col">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">{product.brand}</p>
          <h2 className="serif mb-2 text-2xl font-medium leading-tight text-ink sm:text-[28px]">{product.name}</h2>
          <p className="mb-4 text-[13px] leading-relaxed text-ink/60">{product.quickInterpretation || product.interpretation || getProductUSP(product)}</p>
          <div className="mb-4"><USPBanner product={product} theme={theme} /></div>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-ink/8 bg-white p-4"><p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-ink/45">Reported price</p><p className="serif text-2xl font-semibold" style={{ color: theme.deep }}>{price.priceText}</p>{price.originalText && <p className="text-[11px] text-ink/40 line-through">{price.originalText}</p>}</div>
            <div className="rounded-2xl p-4" style={{ background: verdict.bg }}><p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: verdict.text }}>Interpretation</p><p className="serif text-base font-semibold" style={{ color: verdict.text }}>{getProductVerdict(product)}</p><p className="mt-0.5 text-[11px]" style={{ color: verdict.text }}>{product.rating || "Not listed"} star / {Number(product.reviewCount ?? product.reviews ?? 0).toLocaleString()}</p></div>
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">{chips.map((chip) => <span key={chip} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-ink/60 shadow-sm">{chip}</span>)}</div>
          <div className="mt-auto flex gap-2">
            {product.affiliateLink && product.affiliateLink !== "#" && <button onClick={() => window.open(product.affiliateLink, "_blank")} className="flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-colors" style={{ background: theme.primary }}>View Purchase Options</button>}
            <button onClick={() => navigate("/tools/raktasetu")} className="rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: theme.mid, color: theme.deep }}>Related tests</button>
          </div>
        </div>
      </div>
      <section>
        <h3 className="serif mb-3 text-xl font-medium text-ink">What's inside / <span className="text-ink/40">{ingredients.length}</span></h3>
        {ingredients.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{ingredients.map((ingredient: any, index: number) => <IngredientMicroCard key={`${ingredient.name}-${index}`} ingredient={ingredient} />)}</div> : <div className="rounded-2xl border border-ink/8 bg-white p-5 text-sm text-ink/60">Ingredients not verified yet</div>}
      </section>
      <section>
        <h3 className="serif mb-3 text-xl font-medium text-ink">Research-informed interpretation</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ResearchAngleCard theme={theme} title="Ingredient research" icon="search" body={product.researchPanels?.ingredientResearch || "Ingredient research notes are not available yet."} badge={product.researchPanels?.evidenceStrength} />
          <ResearchAngleCard theme={theme} title="Consumer transparency" icon="shield" body={product.researchPanels?.consumerTransparency || "Transparency notes are not available yet."} />
          <ResearchAngleCard theme={theme} title="Wellness context" icon="heart" body={product.researchPanels?.wellnessContext || "Preventive product guidance only."} />
          <ResearchAngleCard theme={theme} title="Exposure reading" icon="alertTriangle" body={product.researchPanels?.exposureInterpretation || "No exposure notes are available yet."} />
        </div>
      </section>
      {warnings.length > 0 && <section><h3 className="serif mb-3 text-xl font-medium text-ink">Worth keeping in mind</h3><div className="space-y-2">{warnings.map((warning: any, index: number) => <div key={`${warning.title}-${index}`} className="flex gap-3 rounded-2xl bg-terracotta-soft/60 p-4"><Icon name="alertTriangle" size={18} className="mt-0.5 text-terracotta-deep" /><div><p className="font-semibold text-ink">{warning.title}</p><p className="text-sm text-ink/65">{warning.text}</p></div></div>)}</div></section>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white p-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.deep }}>Practical take</p><p className="text-sm leading-relaxed text-ink/70">{product.practicalTake || getProductUSP(product)}</p></div>
        <div className="rounded-2xl border border-ink/10 bg-white p-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.deep }}>Evidence snapshot</p><p className="text-sm leading-relaxed text-ink/70">{product.evidence || product.researchPanels?.ingredientResearch || "Evidence not available."}</p></div>
      </div>
      <Disclaimer type="affiliate" />
    </div>
  );
};

export const ProductComparisonPanel = ({ products, formatPrice }: { products: any[]; formatPrice: (product: any) => string }) => {
  if (products.length < 2) {
    return <div className="rounded-3xl border border-ink/10 bg-white p-8 text-center"><p className="serif text-xl font-semibold text-ink">Select at least two products</p><p className="mt-2 text-sm text-ink/55">Choose products from the grid to build a side-by-side comparison.</p></div>;
  }

  const totalScore = (product: any) => getProductScores(product).reduce((sum, score) => sum + clampScore(score.value), 0);
  const bestOverall = products.reduce((best, product) => (totalScore(product) > totalScore(best) ? product : best), products[0]);
  const bestValue = products.reduce((best, product) => (clampScore(product.scores?.value ?? product.valueScore) > clampScore(best.scores?.value ?? best.valueScore) ? product : best), products[0]);
  const caution = products.find((product) => clampScore(product.scores?.safety ?? product.safetyScore) < 60 || (product.warnings || product.threats || []).length > 0);
  const rows = getProductScores(products[0]).map((score) => score.label);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-aqua-light p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-aqua-deep">Best overall</p><p className="serif mt-1 text-lg font-semibold text-ink">{bestOverall?.name}</p></div>
        <div className="rounded-2xl bg-green-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-green-700">Best value</p><p className="serif mt-1 text-lg font-semibold text-ink">{bestValue?.name}</p></div>
        <div className="rounded-2xl bg-terracotta-soft p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-terracotta-deep">Needs review</p><p className="serif mt-1 text-lg font-semibold text-ink">{caution?.name || "No major caution flagged"}</p></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {products.map((product) => {
          const theme = themeFor(product.cat || product.categorySlug);
          return (
            <div key={product.id} className="rounded-3xl border border-ink/8 bg-white p-4 shadow-glass">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div><p className="text-[10px] font-semibold uppercase tracking-widest text-ink/40">{getProductCategoryLabel(product)} / {getProductFormLabel(product)}</p><h3 className="serif mt-1 text-xl font-semibold text-ink">{product.name}</h3><p className="text-xs text-ink/50">{product.brand} / {formatPrice(product)}</p></div>
                <Badge color={product.verdictColor}>{getProductVerdict(product)}</Badge>
              </div>
              <div className="space-y-3">
                {getProductScores(product).map((score) => <ScoreBar key={score.label} label={score.label} score={score.value} color={score.color || theme.primary} />)}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-ink/65">{getProductUSP(product)}</p>
            </div>
          );
        })}
      </div>
      <div className="overflow-x-auto rounded-3xl border border-ink/10 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b border-ink/10 bg-cream-warm"><th className="px-4 py-3 text-left">Dimension</th>{products.map((product) => <th key={product.id} className="min-w-[190px] px-4 py-3 text-left">{product.name}</th>)}</tr></thead>
          <tbody>
            {rows.map((label) => <tr key={label} className="border-b border-ink/5 align-top"><td className="px-4 py-3 font-semibold text-ink/65">{label}</td>{products.map((product) => { const score = getProductScores(product).find((item) => item.label === label); return <td key={product.id} className="px-4 py-3 text-ink/70"><ScoreBar label={label} score={score?.value} color={score?.color} /></td>; })}</tr>)}
            <tr className="border-b border-ink/5 align-top"><td className="px-4 py-3 font-semibold text-ink/65">Verdict</td>{products.map((product) => <td key={product.id} className="px-4 py-3"><Badge color={product.verdictColor}>{getProductVerdict(product)}</Badge></td>)}</tr>
            <tr className="align-top"><td className="px-4 py-3 font-semibold text-ink/65">Tags</td>{products.map((product) => <td key={product.id} className="px-4 py-3"><div className="flex flex-wrap gap-1">{getProductChips(product).slice(0, 5).map((chip) => <span key={chip} className="rounded-full bg-cream-warm px-2 py-1 text-[10px] font-semibold text-ink/55">{chip}</span>)}</div></td>)}</tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
