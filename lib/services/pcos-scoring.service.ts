type PcosRiskLevel = "low" | "moderate" | "higher";

type PcosRecommendation = {
  title: string;
  description: string;
  priority: string;
  recommendation_type: string;
};

const hasAny = (value: string | undefined, terms: string[]) => {
  const normalized = (value || "").toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
};

export function calculatePcosRisk(answers: Record<string, string>) {
  let riskScore = 0;
  const riskFactors: string[] = [];

  const addFactor = (condition: boolean, label: string, points: number) => {
    if (!condition) return;
    riskScore += points;
    riskFactors.push(label);
  };

  addFactor(
    hasAny(answers.cycles, ["often longer than 35", "fewer than 8", "mostly absent", "over 90 days", "irregular"]),
    "Irregular or infrequent menstrual cycles",
    24,
  );
  addFactor(
    hasAny(answers.acne, ["persistent moderate", "severe", "scarring", "oily"]),
    "Persistent acne or oily-skin concerns",
    12,
  );
  addFactor(
    hasAny(answers.hairRemoval || answers.unwantedHair || answers.hirsutism, ["yes", "multiple", "face", "chest", "abdomen", "back"]),
    "Unwanted facial or body hair pattern",
    14,
  );
  addFactor(
    hasAny(answers.hairLoss, ["noticeable", "progressing", "thinning"]),
    "Noticeable or progressing hair thinning",
    12,
  );
  addFactor(
    hasAny(answers.weightGain || answers.weight || answers.bmi, ["gain", "difficulty", "27.5", "above", "overweight"]),
    "Weight gain or difficulty losing weight",
    10,
  );
  addFactor(
    hasAny(answers.insulinResistance || answers.diabetesHistory || answers.diabetes, ["yes", "insulin", "diabetes", "prediabetes"]),
    "Insulin resistance, prediabetes, or diabetes history",
    14,
  );
  addFactor(
    hasAny(answers.familyHistory || answers.family, ["yes", "pcos"]),
    "Family history of PCOS",
    8,
  );
  addFactor(
    hasAny(answers.acanthosis, ["yes", "dark", "velvety"]),
    "Dark velvety skin patches",
    12,
  );
  addFactor(
    hasAny(answers.fertility || answers.ovulation, ["yes", "concern", "trying", "ovulation", "fertility"]),
    "Fertility or ovulation concerns",
    12,
  );

  riskScore = Math.min(100, riskScore);

  const riskLevel: PcosRiskLevel = riskScore >= 55 ? "higher" : riskScore >= 25 ? "moderate" : "low";
  const hasFactors = riskFactors.length > 0;
  const summary =
    riskLevel === "higher"
      ? "Your answers suggest several PCOS-related features may be worth discussing with a qualified healthcare professional. This is not a diagnosis."
      : riskLevel === "moderate"
        ? "Your answers suggest some PCOS-related features may be present. Tracking symptoms and discussing persistent concerns with a qualified healthcare professional may be helpful."
        : "Your answers suggest fewer PCOS-related features from this reflection. If symptoms persist or concern you, a qualified healthcare professional can help interpret them.";

  const recommendations: PcosRecommendation[] = [
    {
      title: "Speak with a qualified healthcare professional",
      description: hasFactors
        ? "Consider sharing your cycle pattern, skin or hair changes, metabolic clues, and any fertility concerns during a clinical visit."
        : "If symptoms are persistent, changing, or worrying, a clinician can help decide whether further evaluation is appropriate.",
      priority: riskLevel === "higher" ? "important" : "suggested",
      recommendation_type: "clinical_review",
    },
    {
      title: "Track cycle and symptom patterns",
      description: "Keep a simple record of period dates, acne changes, hair changes, weight changes, and mood or energy patterns for future conversations.",
      priority: "suggested",
      recommendation_type: "tracking",
    },
    {
      title: "Use this as awareness guidance only",
      description: "PCOS cannot be confirmed from this reflection alone. Diagnosis requires clinical context and may involve examination, blood tests, or ultrasound when appropriate.",
      priority: "educational",
      recommendation_type: "education",
    },
  ];

  return {
    riskLevel,
    riskScore,
    riskFactors,
    summary,
    recommendations,
  };
}
