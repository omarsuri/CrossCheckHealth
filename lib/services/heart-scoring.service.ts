export type HeartAnswers = Record<string, string>;

export type HeartRiskLevel = "low" | "moderate" | "higher";

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
  summary: string;
  recommendations: HeartRecommendation[];
};

export function calculateHeartRisk(
  answers: Record<string, string>,
  mode: "quick" | "detailed" = "quick"
): HeartRiskResult {
  const riskFactors: string[] = [];
  let points = 0;

  const add = (condition: boolean, label: string, score: number) => {
    if (condition) { riskFactors.push(label); points += score; }
  };

  add(answers.smoking === "Yes", "Tobacco use", 12);
  add(answers.family?.startsWith("Yes - one"), "Family history of heart problems", 10);
  add(answers.family?.startsWith("Yes - two"), "Strong family history of heart problems", 18);
  add(answers.exertion?.startsWith("Yes - only"), "Symptoms during heavy effort", 12);
  add(answers.exertion?.startsWith("Yes - even"), "Symptoms during light activity or rest", 25);
  add(answers.syncope?.startsWith("Yes"), "Unexplained fainting or near-blackout", 25);
  add(answers.bp === "Yes", "High blood pressure or BP medication", 15);
  add(answers.diabetes === "Yes", "Diabetes, prediabetes, or blood sugar medication", 15);
  add(answers.sleep === "Yes", "Possible sleep breathing risk", 8);
  add(answers.health === "Fair", "Fair self-rated health", 6);
  add(answers.health?.startsWith("Poor"), "Poor self-rated health", 12);
  add(answers.activity?.startsWith("Somewhat"), "Some sitting/inactivity risk", 5);
  add(answers.activity?.startsWith("Mostly inactive"), "Low physical activity", 10);
  add(answers.pulse?.startsWith("Sometimes"), "Occasional palpitations at rest", 6);
  add(answers.pulse?.startsWith("Often"), "Frequent palpitations at rest", 12);

  if (mode === "detailed") {
    add(answers.balance?.startsWith("Could not"), "Balance challenge difficulty", 6);
    add(answers.walk?.startsWith("Slow"), "Slow natural walking pace", 6);
    add(answers.srt?.startsWith("Needed") || answers.srt?.startsWith("Very difficult"), "Sit-rise mobility limitation", 6);
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
