"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Icon } from "@/components/ui/Icon";
import { ShareButtons } from "@/components/shared/prototype";

type HeartRecommendation = {
  title?: string;
  description?: string;
  priority?: string;
  recommendation_type?: string;
};

type ResultDetail = {
  source: "heart" | "pcos" | "body_fat";
  assessment?: {
    id: string;
    assessment_type?: string;
    risk_level?: string;
    risk_score?: number;
    result_summary?: string;
    created_at?: string;
  };
  assessment_answers?: Array<{
    id: string;
    question_id?: string;
    answer_value?: string;
  }>;
  assessment_recommendations?: HeartRecommendation[];
  risk_factors?: string[];
  body_fitness_assessment?: {
    id: string;
    goal?: string;
    bmr?: number;
    tdee?: number;
    estimated_body_fat?: number;
    calorie_target?: number;
    projected_weight?: number;
    adherence_score?: number;
    summary?: string;
    recommendations?: string[] | unknown;
    created_at?: string;
  };
};

type ResultPageProps = {
  navigate: (path: string) => void;
  id: string;
};

type ApiResponse = {
  success?: boolean;
  data?: ResultDetail;
  error?: {
    message?: string;
  };
};

const formatDate = (date?: string) => {
  if (!date) return "Saved result";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
};

const formatLabel = (value?: string) => {
  if (value === "pcos") return "PCOS Awareness Assessment";
  if (value === "parent_heart") return "Parent Heart Check";
  if (value === "heart_quick") return "Quick Heart Check";
  if (value === "heart_detailed") return "Detailed Heart Check";
  if (!value) return "Saved Result";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const riskColor = (riskLevel?: string) => {
  if (riskLevel === "low") return "green";
  if (riskLevel === "higher") return "red";
  return "amber";
};

const riskTitle = (riskLevel?: string, assessmentType?: string) => {
  if (!riskLevel) return assessmentType === "pcos" ? "PCOS Awareness Result" : "Heart Result";
  if (assessmentType === "pcos") return riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1) + " Awareness Result";
  return riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1) + " Awareness Risk";
};

const metricValue = (value?: number | null, suffix = "") => {
  if (value === null || value === undefined) return "Not recorded";
  return `${value}${suffix}`;
};

const bodyRecommendations = (recommendations: string[] | unknown) => {
  return Array.isArray(recommendations) ? recommendations.filter((item): item is string => typeof item === "string") : [];
};

export const ResultPage = ({ navigate, id }: ResultPageProps) => {
  const [result, setResult] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadResult = async () => {
      const resultId = id;

      if (!resultId) {
        setError("Result id is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/results/${encodeURIComponent(resultId)}`);
        const payload: ApiResponse | null = await response.json().catch(() => null);

        if (response.status === 404) {
          throw new Error(payload?.error?.message || "Result not found.");
        }

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error?.message || "Unable to load this result.");
        }

        if (!payload?.data) {
          throw new Error("Result not found.");
        }

        if (active) setResult(payload.data);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load this result.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadResult();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 slide-up">
        <h1 className="text-2xl font-bold text-charcoal mb-2">Assessment Result</h1>
        <p className="text-gray-500 mb-6">Loading your saved result</p>
        <Card className="text-center py-12">
          <Icon name="activity" size={32} className="text-gray-300 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-charcoal mb-2">Loading result</h2>
          <p className="text-sm text-gray-500">Fetching the details for this assessment.</p>
        </Card>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 slide-up">
        <h1 className="text-2xl font-bold text-charcoal mb-2">Assessment Result</h1>
        <p className="text-gray-500 mb-6">We could not open this result</p>
        <Card className="text-center py-12">
          <Icon name="alertTriangle" size={32} className="text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-charcoal mb-2">Result not found</h2>
          <p className="text-sm text-gray-500 mb-4">{error || "This result may no longer be available."}</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  if (result.source === "body_fat") {
    const assessment = result.body_fitness_assessment;
    const recommendations = bodyRecommendations(assessment?.recommendations);

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 slide-up">
        <h1 className="text-2xl font-bold text-charcoal mb-2">Assessment Result</h1>
        <p className="text-gray-500 mb-6">Body Fat Assessment - {formatDate(assessment?.created_at)}</p>
        <Card className="text-center mb-6">
          <div className="w-20 h-20 bg-teal-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="scale" size={32} className="text-teal-deep" />
          </div>
          <h2 className="text-3xl font-bold text-charcoal mb-2">{metricValue(assessment?.estimated_body_fat, "%")}</h2>
          <Badge color="teal">Estimated Body Fat</Badge>
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Fitness snapshot</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cream-warm rounded-2xl p-3">
              <p className="text-xs text-gray-500">BMR</p>
              <p className="text-lg font-bold text-charcoal">{metricValue(assessment?.bmr, " kcal")}</p>
            </div>
            <div className="bg-cream-warm rounded-2xl p-3">
              <p className="text-xs text-gray-500">TDEE</p>
              <p className="text-lg font-bold text-charcoal">{metricValue(assessment?.tdee, " kcal")}</p>
            </div>
            <div className="bg-cream-warm rounded-2xl p-3">
              <p className="text-xs text-gray-500">Calorie Target</p>
              <p className="text-lg font-bold text-charcoal">{metricValue(assessment?.calorie_target, " kcal")}</p>
            </div>
            <div className="bg-cream-warm rounded-2xl p-3">
              <p className="text-xs text-gray-500">Projected Weight</p>
              <p className="text-lg font-bold text-charcoal">{metricValue(assessment?.projected_weight, " kg")}</p>
            </div>
            <div className="bg-cream-warm rounded-2xl p-3">
              <p className="text-xs text-gray-500">Adherence Score</p>
              <p className="text-lg font-bold text-charcoal">{metricValue(assessment?.adherence_score, "%")}</p>
            </div>
            <div className="bg-cream-warm rounded-2xl p-3">
              <p className="text-xs text-gray-500">Goal</p>
              <p className="text-lg font-bold text-charcoal">{formatLabel(assessment?.goal)}</p>
            </div>
          </div>
        </Card>

        {assessment?.summary ? (
          <Card className="mb-6">
            <h3 className="font-semibold text-charcoal mb-3">Summary</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{assessment.summary}</p>
          </Card>
        ) : null}

        {recommendations.length > 0 ? (
          <Card className="mb-6">
            <h3 className="font-semibold text-charcoal mb-3">Recommendations</h3>
            <div className="space-y-3">
              {recommendations.map((recommendation) => (
                <div key={recommendation} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-soft flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="check" size={14} className="text-teal-deep" />
                  </div>
                  <p className="text-sm text-gray-600">{recommendation}</p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Share this result</h3>
          <ShareButtons />
        </Card>
        <Disclaimer type="general" />
        <div className="flex gap-3 mt-6">
          <Button variant="primary" fullWidth onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          <Button variant="outline" fullWidth onClick={() => navigate("/tools")}>Explore More Tools</Button>
        </div>
      </div>
    );
  }

  const assessment = result.assessment;
  const recommendations = result.assessment_recommendations ?? [];
  const answers = result.assessment_answers ?? [];
  const riskFactors = result.risk_factors ?? [];
  const isPcos = assessment?.assessment_type === "pcos" || result.source === "pcos";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 slide-up">
      <h1 className="text-2xl font-bold text-charcoal mb-2">Assessment Result</h1>
      <p className="text-gray-500 mb-6">{formatLabel(assessment?.assessment_type)} - {formatDate(assessment?.created_at)}</p>
      <Card className="text-center mb-6">
        <div className={`w-20 h-20 ${isPcos ? "bg-teal-soft" : riskColor(assessment?.risk_level) === "green" ? "bg-green-50" : riskColor(assessment?.risk_level) === "red" ? "bg-red-50" : "bg-amber-50"} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <Icon name={isPcos ? "fileText" : "heart"} size={32} className={isPcos ? "text-teal-deep" : riskColor(assessment?.risk_level) === "green" ? "text-green-600" : riskColor(assessment?.risk_level) === "red" ? "text-red-500" : "text-amber-500"} />
        </div>
        <h2 className="text-3xl font-bold text-charcoal mb-2">{riskTitle(assessment?.risk_level, assessment?.assessment_type)}</h2>
        <Badge color={riskColor(assessment?.risk_level)}>Score {metricValue(assessment?.risk_score)}</Badge>
      </Card>

      {assessment?.result_summary ? (
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Summary</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{assessment.result_summary}</p>
        </Card>
      ) : null}

      {riskFactors.length > 0 ? (
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Risk Factors</h3>
          <div className="space-y-3">
            {riskFactors.map((factor) => (
              <div key={factor} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-soft flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon name="info" size={14} className="text-teal-deep" />
                </div>
                <p className="text-sm text-gray-600">{factor}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {recommendations.length > 0 ? (
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Recommendations</h3>
          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div key={`${recommendation.title}-${index}`} className="p-3 rounded-2xl bg-cream-warm">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h4 className="font-semibold text-charcoal text-sm">{recommendation.title || "Recommended next step"}</h4>
                  {recommendation.priority ? <Badge color="gray">{recommendation.priority}</Badge> : null}
                </div>
                {recommendation.description ? <p className="text-sm text-gray-600">{recommendation.description}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {answers.length > 0 ? (
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Answers</h3>
          <div className="space-y-2">
            {answers.map((answer) => (
              <div key={answer.id} className="flex items-start justify-between gap-4 py-2 border-b border-ink/5 last:border-b-0">
                <p className="text-sm font-medium text-charcoal">{formatLabel(answer.question_id)}</p>
                <p className="text-sm text-gray-500 text-right">{answer.answer_value || "Not recorded"}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="mb-6">
        <h3 className="font-semibold text-charcoal mb-3">Share this result</h3>
        <ShareButtons />
      </Card>
      <Disclaimer type="general" />
      <div className="flex gap-3 mt-6">
        <Button variant="primary" fullWidth onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        <Button variant="outline" fullWidth onClick={() => navigate("/tools")}>Explore More Tools</Button>
      </div>
    </div>
  );
};
