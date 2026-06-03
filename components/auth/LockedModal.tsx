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
import { ScannerModal } from "@/components/tools/products/ProductScanner";

export const LockedModal = ({ isOpen, onClose, featureName, onLogin }) => (
  <Modal isOpen={isOpen} onClose={onClose} size="md">
    <div className="text-center">
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon name="lock" size={28} className="text-amber-600" />
      </div>
      <h3 className="text-xl font-bold text-charcoal mb-2">{featureName} is locked</h3>
      <p className="text-gray-500 mb-6">Detailed Assessment is available for members or one-time access. Create a free account to save your results, track your history, and get better recommendations.</p>
      <div className="space-y-3">
        <Button variant="primary" fullWidth onClick={() => { onClose(); onLogin(); }}>Login / Create Free Account</Button>
        <Button variant="amber" fullWidth onClick={() => alert("Mock payment flow would start here")}>Continue with Payment</Button>
        <Button variant="ghost" fullWidth onClick={onClose}>Go Back to Quick Assessment</Button>
      </div>
    </div>
  </Modal>
);

