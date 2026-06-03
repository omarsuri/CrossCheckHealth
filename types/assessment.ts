export type AssessmentCategory = "heart" | "body" | "product" | "pcos" | "bloodwork" | string;

export type AssessmentResult = {
  id: string;
  type: string;
  date: string;
  result: string;
  category: AssessmentCategory;
  color?: string;
  score?: number;
  answers?: Record<string, unknown>;
};
