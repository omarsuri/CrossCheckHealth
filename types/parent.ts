export type ParentProfileStatus = "pending" | "completed" | "locked" | string;

export type ParentProfile = {
  id: string | number;
  name: string;
  relation: string;
  age?: number;
  gender?: string;
  location?: string;
  lastAssessment?: string;
  latestResult?: string;
  status: ParentProfileStatus;
  email?: string;
  phone?: string;
};
