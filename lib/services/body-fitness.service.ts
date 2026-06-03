export type BodyFitnessInput = {
  goal: string;
  sex: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  waist_cm?: number;
  activity_level: string;
  workout_frequency?: string;
  sleep_hours?: number;
  timeline_weeks?: number;
};

export type BodyFitnessResult = {
  bmr: number;
  tdee: number;
  estimated_body_fat: number;
  calorie_target: number;
  projected_weight: number;
  adherence_score: number;
  summary: string;
  recommendations: string[];
};

const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  light: 1.375,
  moderately_active: 1.55,
  moderate: 1.55,
  very_active: 1.725,
  active: 1.725,
  extra_active: 1.9,
};

const workoutFrequencyScores: Record<string, number> = {
  none: 0,
  "0": 0,
  "1_2": 2,
  low: 2,
  "3_4": 4,
  moderate: 4,
  "5+": 6,
  high: 6,
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

function getActivityMultiplier(activityLevel: string) {
  return activityMultipliers[normalizeKey(activityLevel)] ?? 1.2;
}

function getWorkoutFrequency(workoutFrequency?: string) {
  if (!workoutFrequency) return 0;
  return workoutFrequencyScores[normalizeKey(workoutFrequency)] ?? 0;
}

function getWeeklyWeightChange(goal: string) {
  const normalizedGoal = normalizeKey(goal);
  if (normalizedGoal === "lose_fat" || normalizedGoal === "fat_loss") return -0.5;
  if (normalizedGoal === "gain_muscle" || normalizedGoal === "muscle_gain") return 0.25;
  if (normalizedGoal === "recomp" || normalizedGoal === "body_recomposition") return -0.2;
  return 0;
}

function buildSummary(goal: string, projectedWeight: number, timelineWeeks: number, calorieTarget: number) {
  const direction = projectedWeight > 0 ? "higher" : projectedWeight < 0 ? "lower" : "stable";
  const goalText = goal.replace(/_/g, " ");

  return `Your ${goalText} forecast suggests a ${direction} projected weight trend over ${timelineWeeks} weeks, with an educational calorie target of ${calorieTarget} kcal per day. This is fitness guidance for planning and awareness, not medical advice.`;
}

function buildRecommendations(input: BodyFitnessInput, adherenceScore: number) {
  const recommendations = [
    "Track weight, waist, sleep, and training consistently so you can compare real progress with the forecast.",
    "Keep protein, daily movement, and recovery habits steady before making aggressive calorie changes.",
  ];

  if ((input.sleep_hours ?? 7.5) < 7) {
    recommendations.push("Improving sleep toward 7-8 hours may support recovery, appetite control, and consistency.");
  }

  if (getWorkoutFrequency(input.workout_frequency) < 3) {
    recommendations.push("Building toward 3 or more weekly training sessions can improve adherence and body composition progress.");
  }

  if (adherenceScore < 60) {
    recommendations.push("Choose a smaller, repeatable habit target first; consistency matters more than a perfect plan.");
  }

  return recommendations;
}

export function calculateBodyFitness(input: BodyFitnessInput): BodyFitnessResult {
  const sex = normalizeKey(input.sex);
  const heightMeters = input.height_cm / 100;
  const bmi = input.weight_kg / Math.max(1, heightMeters * heightMeters);
  const activityMultiplier = getActivityMultiplier(input.activity_level);
  const timelineWeeks = input.timeline_weeks ?? 12;
  const sleepHours = input.sleep_hours ?? 7.5;
  const workoutFrequency = getWorkoutFrequency(input.workout_frequency);

  const bmr = sex === "female"
    ? 10 * input.weight_kg + 6.25 * input.height_cm - 5 * input.age - 161
    : 10 * input.weight_kg + 6.25 * input.height_cm - 5 * input.age + 5;
  const tdee = bmr * activityMultiplier;

  const sexAdjustment = sex === "female" ? -5.4 : -16.2;
  const estimatedBodyFat = Math.max(5, Math.min(50, 1.2 * bmi + 0.23 * input.age + sexAdjustment));

  const weeklyWeightChange = getWeeklyWeightChange(input.goal);
  const calorieOffset = weeklyWeightChange < 0 ? -500 : weeklyWeightChange > 0 ? 300 : 0;
  const calorieTarget = tdee + calorieOffset;
  const projectedWeight = input.weight_kg + weeklyWeightChange * timelineWeeks;

  const sleepScore = sleepHours >= 7 ? 25 : sleepHours >= 6 ? 18 : 10;
  const workoutScore = workoutFrequency >= 3 ? 25 : workoutFrequency >= 1 ? 18 : 10;
  const activityScore = activityMultiplier >= 1.55 ? 25 : activityMultiplier >= 1.375 ? 20 : 15;
  const adherenceScore = Math.min(100, sleepScore + workoutScore + activityScore + 25);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    estimated_body_fat: Math.round(estimatedBodyFat * 10) / 10,
    calorie_target: Math.round(calorieTarget),
    projected_weight: Math.round(projectedWeight * 10) / 10,
    adherence_score: adherenceScore,
    summary: buildSummary(input.goal, projectedWeight - input.weight_kg, timelineWeeks, Math.round(calorieTarget)),
    recommendations: buildRecommendations(input, adherenceScore),
  };
}
