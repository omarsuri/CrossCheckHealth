export type HeartAnswers = Record<string, unknown>;

export type HeartRiskLevel = "low" | "moderate" | "high" | "higher";

export type HeartRecommendation = {
  title: string;
  description: string;
  priority: string;
  recommendation_type: string;
};

export type HeartRiskResult = {
  riskLevel: HeartRiskLevel;
  riskScore: number;
  riskFactors: string[];
  automaticHighRisk?: boolean;
  riskFactorCount?: number;
  summary: string;
  recommendations: HeartRecommendation[];
};

const resultMessages = {
  high: "Your answers suggest a higher heart-health risk profile. This does not mean you definitely have heart disease, but it means you should speak with a qualified healthcare professional before starting intense exercise or ignoring symptoms.",
  moderate: "Your answers suggest a moderate heart-health risk profile. You may have a few factors that can increase heart risk over time. Lifestyle changes and a basic health check, such as blood pressure, cholesterol, and blood sugar testing, may be helpful.",
  low: "Your answers suggest a lower heart-health risk profile based on this quick check. Continue maintaining healthy habits and consider regular checkups, especially if your lifestyle or health changes.",
};

const asArray = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : [];
const asString = (value: unknown): string => typeof value === "string" ? value : "";
const asNumber = (value: unknown): number | null => {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
};

function calculateQuickHeartRisk(answers: HeartAnswers): HeartRiskResult {
  const riskFactors: string[] = [];
  const automaticReasons: string[] = [];
  let automaticHighRisk = false;

  const addRiskFactor = (condition: boolean, label: string) => {
    if (condition && !riskFactors.includes(label)) riskFactors.push(label);
  };
  const addAutomaticHighRisk = (condition: boolean, label: string) => {
    if (condition) {
      automaticHighRisk = true;
      if (!automaticReasons.includes(label)) automaticReasons.push(label);
    }
  };

  const knownConditions = asArray(answers.known_conditions);
  const realConditions = knownConditions.filter(option => option !== "None of these" && option !== "Not sure");
  addAutomaticHighRisk(realConditions.length > 0, "Known heart-health condition");
  addAutomaticHighRisk(knownConditions.includes("Diabetes"), "Diabetes");

  const warningSymptoms = asArray(answers.warning_symptoms);
  addAutomaticHighRisk(warningSymptoms.some(option => option !== "None of these"), "Warning symptoms");

  const age = asNumber(answers.age);
  const sex = asString(answers.sex);
  addRiskFactor((sex === "Male" && age !== null && age >= 45) || (sex === "Female" && age !== null && age >= 55), "Age-related risk");

  const familyHistory = asString(answers.family_history);
  addRiskFactor(familyHistory.startsWith("Yes"), "Family history");

  const nicotine = asString(answers.nicotine);
  addRiskFactor(
    nicotine === "Yes, I currently smoke" || nicotine === "Yes, I vape nicotine" || nicotine === "I stopped within the last 6 months",
    "Smoking or recent nicotine use"
  );

  const physicalActivity = asString(answers.physical_activity);
  addRiskFactor(physicalActivity === "No" || physicalActivity === "Not sure", "Low physical activity");

  const heightCm = asNumber(answers.height_cm);
  const weightKg = asNumber(answers.weight_kg);
  let bmi: number | null = null;
  if (heightCm && weightKg) {
    const heightMeters = heightCm / 100;
    bmi = Math.round((weightKg / (heightMeters * heightMeters)) * 10) / 10;
    addRiskFactor(bmi >= 30, "BMI in obesity range");
  }

  const waistKnown = asString(answers.waist_known);
  const waistSize = asNumber(answers.waist_size);
  const waistUnit = asString(answers.waist_unit);
  if (waistKnown === "Yes" && waistSize !== null) {
    const largerWaist = sex === "Male"
      ? (waistUnit === "in" ? waistSize > 40 : waistSize > 102)
      : sex === "Female"
        ? (waistUnit === "in" ? waistSize > 35 : waistSize > 88)
        : false;
    addRiskFactor(largerWaist, "Larger waist size");
  }

  const cholesterol = asString(answers.cholesterol);
  addRiskFactor(cholesterol.startsWith("Yes"), "High cholesterol");

  const bloodSugar = asString(answers.blood_sugar);
  addRiskFactor(bloodSugar === "Yes, I have prediabetes" || bloodSugar === "Yes, I have high blood sugar", "High blood sugar or prediabetes");
  addAutomaticHighRisk(bloodSugar === "Yes, I have diabetes", "Diabetes");

  const riskFactorCount = riskFactors.length;
  const riskLevel: HeartRiskLevel = automaticHighRisk ? "high" : riskFactorCount >= 2 ? "moderate" : "low";
  const riskScore = riskLevel === "high" ? 90 : riskLevel === "moderate" ? 50 : 15;

  return {
    riskLevel,
    riskScore,
    riskFactors,
    automaticHighRisk,
    riskFactorCount,
    summary: resultMessages[riskLevel],
    recommendations: [
      { title: "Review your result with a healthcare professional", description: "Especially before starting intense exercise or ignoring symptoms.", priority: riskLevel === "high" ? "important" : "suggested", recommendation_type: "doctor" },
      { title: "Check blood pressure, cholesterol, and blood sugar", description: "A basic health check can help clarify your heart-health profile.", priority: "suggested", recommendation_type: "screening" },
      { title: "Keep building heart-healthy habits", description: "Movement, tobacco avoidance, sleep, and balanced meals can all help over time.", priority: "suggested", recommendation_type: "lifestyle" },
    ],
  };
}

export function calculateHeartRisk(
  answers: HeartAnswers,
  mode: "quick" | "detailed" = "quick"
): HeartRiskResult {
  if (mode === "quick") return calculateQuickHeartRisk(answers);

  const riskFactors: string[] = [];
  let points = 0;

  const add = (condition: boolean, label: string, score: number) => {
    if (condition) { riskFactors.push(label); points += score; }
  };

  const smoking = asString(answers.smoking);
  const family = asString(answers.family);
  const exertion = asString(answers.exertion);
  const syncope = asString(answers.syncope);
  const bp = asString(answers.bp);
  const diabetes = asString(answers.diabetes);
  const sleep = asString(answers.sleep);
  const health = asString(answers.health);
  const activity = asString(answers.activity);
  const pulse = asString(answers.pulse);

  add(smoking === "Yes", "Tobacco use", 12);
  add(family.startsWith("Yes - one"), "Family history of heart problems", 10);
  add(family.startsWith("Yes - two"), "Strong family history of heart problems", 18);
  add(exertion.startsWith("Yes - only"), "Symptoms during heavy effort", 12);
  add(exertion.startsWith("Yes - even"), "Symptoms during light activity or rest", 25);
  add(syncope.startsWith("Yes"), "Unexplained fainting or near-blackout", 25);
  add(bp === "Yes", "High blood pressure or BP medication", 15);
  add(diabetes === "Yes", "Diabetes, prediabetes, or blood sugar medication", 15);
  add(sleep === "Yes", "Possible sleep breathing risk", 8);
  add(health === "Fair", "Fair self-rated health", 6);
  add(health.startsWith("Poor"), "Poor self-rated health", 12);
  add(activity.startsWith("Somewhat"), "Some sitting/inactivity risk", 5);
  add(activity.startsWith("Mostly inactive"), "Low physical activity", 10);
  add(pulse.startsWith("Sometimes"), "Occasional palpitations at rest", 6);
  add(pulse.startsWith("Often"), "Frequent palpitations at rest", 12);

  if (mode === "detailed") {
    const balance = asString(answers.balance);
    const walk = asString(answers.walk);
    const srt = asString(answers.srt);
    add(balance.startsWith("Could not"), "Balance challenge difficulty", 6);
    add(walk.startsWith("Slow"), "Slow natural walking pace", 6);
    add(srt.startsWith("Needed") || srt.startsWith("Very difficult"), "Sit-rise mobility limitation", 6);
  }

  const riskScore = Math.min(100, points);
  const riskLevel: HeartRiskLevel = riskScore >= 45 ? "higher" : riskScore >= 18 ? "moderate" : "low";
  const summary = riskLevel === "higher"
    ? "Your answers suggest several heart-health awareness risk factors. This is not a diagnosis, but a professional check-up may be sensible."
    : riskLevel === "moderate"
      ? "Your answers suggest some heart-health awareness risk factors. Tracking and prevention steps may be useful."
      : "Your answers suggest a low number of heart-health awareness risk factors.";

  return {
    riskLevel,
    riskScore,
    riskFactors,
    summary,
    recommendations: [
      { title: "Track blood pressure", description: "Regular BP checks help identify changes early.", priority: "suggested", recommendation_type: "lifestyle" },
      { title: "Review lifestyle basics", description: "Focus on movement, sleep, tobacco avoidance, and balanced meals.", priority: "suggested", recommendation_type: "lifestyle" },
      { title: "Speak with a healthcare professional", description: "Especially if you reported symptoms, fainting, diabetes, high BP, or strong family history.", priority: riskLevel === "higher" ? "important" : "suggested", recommendation_type: "doctor" }
    ]
  };
}
