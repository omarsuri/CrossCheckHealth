export const MOCK_DOCTORS = [
  { id: 1, name: "Dr. Sarah Chen", specialty: "Cardiologist", location: "Downtown Medical Center", rating: 4.9, reviews: 128, type: "In-person", distance: "1.2 miles" },
  { id: 2, name: "Dr. Michael Torres", specialty: "General Practitioner", location: "Westside Health Clinic", rating: 4.7, reviews: 89, type: "In-person & Virtual", distance: "2.5 miles" },
  { id: 3, name: "HealthFirst Online", specialty: "Preventive Health", location: "Online Consultation", rating: 4.6, reviews: 245, type: "Virtual", distance: "Remote" },
];

export const MOCK_ASSESSMENTS = [
  { id: "qhh-001", type: "Quick Heart Check", date: "11 May 2026", result: "Moderate risk", category: "heart", color: "amber" },
  { id: "bfa-001", type: "Body Fat Assessment", date: "10 May 2026", result: "24% estimate", category: "body", color: "teal" },
  { id: "pc-001", type: "Product Comparison", date: "9 May 2026", result: "BP Monitor vs Smart Watch", category: "product", color: "navy" },
];

export const MOCK_PARENTS = [
  { id: 1, name: "Amina", relation: "Mother", age: 58, gender: "Female", location: "Cairo, Egypt", lastAssessment: "3 May 2026", latestResult: "Low risk", status: "completed", email: "amina@example.com", phone: "+20 10x xxx xxxx" },
  { id: 2, name: "Hassan", relation: "Father", age: 62, gender: "Male", location: "Cairo, Egypt", lastAssessment: "Pending", latestResult: "—", status: "pending", email: "hassan@example.com", phone: "+20 10x xxx xxxx" },
];
