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

export const BodyFatLanding = ({ navigate, user, onLogin }) => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 slide-up">
    <div className="text-center mb-12">
      <div className="w-16 h-16 bg-teal-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon name="scale" size={32} className="text-teal-deep" />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-charcoal mb-3">Body Fat & Fitness Prediction</h1>
      <p className="text-gray-500 max-w-xl mx-auto">Estimate body fat, metabolic indicators, and progress forecast using body measurements and lifestyle inputs.</p>
    </div>
    <Disclaimer type="general" />
    <Card className="text-center max-w-lg mx-auto">
      <Badge color="teal">Premium Tool</Badge>
      <h3 className="text-xl font-bold text-charcoal mt-3 mb-2">AI-Powered Body Forecast</h3>
      <ul className="text-sm text-gray-500 space-y-2 mb-6 text-left max-w-xs mx-auto">
        <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-teal-deep" /> 10 AURA Lite setup inputs</li>
        <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-teal-deep" /> Timeline projection chart</li>
        <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-teal-deep" /> What-if simulator sliders</li>
        <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-teal-deep" /> AI-style coach insight</li>
      </ul>
      <Button variant="primary" fullWidth icon="activity" onClick={() => navigate("/tools/body-fat/flow")}>Start Body Assessment</Button>
      {!user && <p className="text-xs text-gray-400 mt-3">Login required to save results</p>}
    </Card>
  </div>
);


