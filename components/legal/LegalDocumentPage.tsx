"use client";

import React, { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MOCK_ASSESSMENTS, MOCK_DOCTORS, MOCK_PARENTS } from "@/data/mockDashboard";
import { MOCK_PRODUCTS } from "@/data/mockProducts";
import { RAKTASETU_TESTS } from "@/data/mockBloodTests";
import { BODY_FITNESS_STEPS } from "@/data/bodyQuestions";
import { QUICK_HEART_QUESTIONS, DETAILED_HEART_QUESTIONS } from "@/data/heartQuestions";
import { PCOS_STEPS } from "@/data/pcosQuestions";
import { LEGAL_DOCS } from "@/data/legalDocs";
import { ECGBackground, MagneticWrap, ScoreRing, ShareButtons, TiltCard, track, useMouseParallax, useScrollReveal, useTilt } from "@/components/shared/prototype";
import { LockedModal } from "@/components/auth/LockedModal";
import { ScannerModal } from "@/components/tools/products/ProductScanner";

export const LegalDocumentPage = ({ docKey, navigate }) => {
  const doc = LEGAL_DOCS[docKey] || LEGAL_DOCS.privacy;
  const links = [
    ["privacy", "Privacy"], ["terms", "Terms"], ["disclaimer", "Medical"], ["refunds", "Refunds"],
    ["grievance", "Grievance"], ["cookies", "Cookies"], ["dpa", "DPA"],
  ];
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 slide-up">
      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="bg-white rounded-2xl border border-ink/5 shadow-glass p-3">
            {links.map(([key, label]) => <button key={key} onClick={() => navigate(key === "privacy" ? "/privacy" : key === "disclaimer" ? "/disclaimer" : "/" + key)} className={(docKey === key ? "bg-ink text-cream" : "text-ink/65 hover:bg-cream-warm") + " w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors"}>{label}</button>)}
          </div>
        </aside>
        <div>
          <Badge color={doc.urgent ? "red" : "teal"}>{doc.source}</Badge>
          <h1 className="serif text-4xl sm:text-5xl font-medium text-ink mt-4 mb-3">{doc.title}</h1>
          <p className="text-sm text-ink/45 mb-6">Last updated: {doc.updated} · Effective date: {doc.updated}</p>
          <Card hover={false} className={doc.urgent ? "border-2 border-red-100" : "mb-6"}>
            {doc.urgent && <div className="flex items-start gap-3 mb-4"><Icon name="alertTriangle" size={24} className="text-red-500 shrink-0" /><p className="text-sm font-semibold text-red-700">Important: do not use CrossCheckHealth as a substitute for professional medical advice or emergency care.</p></div>}
            <p className="text-ink/70 leading-relaxed">{doc.summary}</p>
          </Card>
          <div className="space-y-4 mt-6">
            {doc.sections.map(([heading, body], idx) => (
              <Card key={heading} hover={false}>
                <p className="text-xs uppercase tracking-widest text-aqua-deep font-medium mb-2">{String(idx + 1).padStart(2, "0")}</p>
                <h2 className="text-xl font-semibold text-ink mb-3">{heading}</h2>
                <p className="text-sm text-ink/65 leading-relaxed">{body}</p>
              </Card>
            ))}
          </div>
          <Card hover={false} className="mt-6 bg-cream-warm">
            <h2 className="text-lg font-semibold text-ink mb-2">Contact placeholders</h2>
            <p className="text-sm text-ink/65 leading-relaxed">Production deployment should replace placeholder emails and officer details from the source documents, including legal@[●], grievance@[●], privacy@[●], billing@[●], and any required phone/address details.</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const PrivacyPage = ({ navigate }) => <LegalDocumentPage docKey="privacy" navigate={navigate} />;
export const DisclaimerPage = ({ navigate }) => <LegalDocumentPage docKey="disclaimer" navigate={navigate} />;


