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

export const SupportPage = ({ navigate }) => {
  const [openFaq, setOpenFaq] = useState(null);
  const faqs = [
    { q: "Is CrossCheckHealth a medical diagnosis?", a: "No. CrossCheckHealth provides health awareness insights only. It is not a medical diagnosis tool and should not replace professional medical advice." },
    { q: "Do I need to login?", a: "The quick heart assessment is free without login. Other tools like body fat prediction and parent profiles require an account to save history and recommendations." },
    { q: "Can I add my parents?", a: "Yes. Free users can add up to two parent profiles. You can send them assessment invites and track their wellbeing history with their consent." },
    { q: "Are product links affiliate links?", a: "Some product links may be affiliate links. This does not affect the price you pay. We only recommend products that meet our science and safety criteria." },
    { q: "Is my data safe?", a: "We use industry-standard security practices. Your health data is encrypted and never sold to third parties. You can delete your account and data at any time." },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 slide-up">
      <h1 className="text-3xl font-bold text-charcoal mb-2">Support & FAQ</h1>
      <p className="text-gray-500 mb-8">Find answers or get in touch with our team</p>

      <Card className="mb-8">
        <h2 className="text-xl font-semibold text-charcoal mb-4">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors">
                <span className="font-medium text-charcoal text-sm">{faq.q}</span>
                <Icon name={openFaq === i ? "chevronDown" : "chevronRight"} size={16} className="text-gray-400" />
              </button>
              {openFaq === i && <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">{faq.a}</div>}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-8">
        <h2 className="text-xl font-semibold text-charcoal mb-4">Contact Us</h2>
        <form onSubmit={e => { e.preventDefault(); alert("Message sent! We'll respond within 24 hours."); }} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none" placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none">
              {["General question", "Account help", "Parent profile help", "SwasthyaSathi help", "Privacy concern", "Refund or cancellation", "Grievance redressal", "Other"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea required rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none" placeholder="How can we help you?" />
          </div>
          <Button variant="primary" type="submit" fullWidth icon="send">Send Message</Button>
        </form>
      </Card>

      <Disclaimer type="general" />
    </div>
  );
};




