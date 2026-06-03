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

export const HeartLanding = ({ navigate, user, onLogin }) => {
  const [lockedOpen, setLockedOpen] = useState(false);
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 slide-up">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon name="heart" size={32} className="text-red-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-charcoal mb-3">Heart Health Assessment</h1>
        <p className="text-gray-500 max-w-xl mx-auto">Understand your heart health risk factors through a simple questionnaire. This is not a diagnosis.</p>
      </div>
      <Disclaimer type="general" />
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="text-center">
          <Badge color="green">Free</Badge>
          <h3 className="text-xl font-bold text-charcoal mt-3 mb-2">Quick Assessment</h3>
          <ul className="text-sm text-gray-500 space-y-2 mb-6 text-left max-w-xs mx-auto">
            <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" /> 5 questions</li>
            <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" /> Takes 1 minute</li>
            <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" /> No login required</li>
            <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" /> Basic risk awareness</li>
          </ul>
          <Button variant="primary" fullWidth onClick={() => navigate("/tools/heart-health/quick")}>Start Free Quick Check</Button>
        </Card>
        <Card className="text-center border-2 border-amber-100">
          <Badge color="amber">Members / Payment</Badge>
          <h3 className="text-xl font-bold text-charcoal mt-3 mb-2">Detailed Assessment</h3>
          <ul className="text-sm text-gray-500 space-y-2 mb-6 text-left max-w-xs mx-auto">
            <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-teal-deep" /> 13 questions</li>
            <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-teal-deep" /> More personalized</li>
            <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-teal-deep" /> Saves to profile</li>
            <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-teal-deep" /> Full recommendations</li>
          </ul>
          <Button variant="amber" fullWidth icon="lock" onClick={() => user ? navigate("/tools/heart-health/detailed") : setLockedOpen(true)}>Unlock Detailed Assessment</Button>
        </Card>
      </div>
      <LockedModal isOpen={lockedOpen} onClose={() => setLockedOpen(false)} featureName="Detailed Heart Assessment" onLogin={onLogin} />
    </div>
  );
};


