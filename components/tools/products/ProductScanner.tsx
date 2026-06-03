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

export const ScannerModal = ({ isOpen, onClose }) => {
  const [scanning, setScanning] = useState(true);
  useEffect(() => {
    if (isOpen) { setScanning(true); const t = setTimeout(() => setScanning(false), 2500); return () => clearTimeout(t); }
  }, [isOpen]);
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="text-center">
        {scanning ? (
          <>
            <div className="relative w-64 h-64 mx-auto mb-6 bg-gray-900 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center"><Icon name="camera" size={48} className="text-white/30" /></div>
              <div className="absolute inset-4 border-2 border-white/30 rounded-xl" />
              <div className="absolute left-0 right-0 h-0.5 bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)] scanner-line" />
              <div className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-sm">Scanning label...</div>
            </div>
            <p className="text-gray-500">Point your camera at the product label</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="check" size={28} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-charcoal mb-2">Product Identified</h3>
            <p className="text-gray-500 mb-6">"Generic Omega-3 (EPA/DHA) Fish Oil" found. Opening comparison details...</p>
            <Button variant="primary" fullWidth onClick={onClose}>View Product</Button>
          </>
        )}
      </div>
    </Modal>
  );
};

// ===================== NAVIGATION =====================




