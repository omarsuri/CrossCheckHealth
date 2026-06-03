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

export const PricingPage = ({ navigate }) => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 slide-up">
    <div className="text-center mb-12">
      <h1 className="text-3xl md:text-4xl font-bold text-charcoal mb-3">Choose Your Plan</h1>
      <p className="text-gray-500">Health awareness tools for every stage of your journey</p>
    </div>
    <div className="grid md:grid-cols-3 gap-8">
      <Card className="text-center">
        <Badge color="gray">Free</Badge>
        <h3 className="text-2xl font-bold text-charcoal mt-3 mb-1">$0</h3>
        <p className="text-sm text-gray-400 mb-6">Forever free</p>
        <ul className="text-sm text-gray-600 space-y-3 mb-6 text-left">
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" />Quick heart assessment</li>
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" />Basic product comparison</li>
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" />Limited dashboard</li>
          <li className="flex items-center gap-2"><Icon name="x" size={14} className="text-gray-300" /><span className="text-gray-400">Detailed assessments</span></li>
          <li className="flex items-center gap-2"><Icon name="x" size={14} className="text-gray-300" /><span className="text-gray-400">Body fat prediction</span></li>
          <li className="flex items-center gap-2"><Icon name="x" size={14} className="text-gray-300" /><span className="text-gray-400">Parent profiles</span></li>
        </ul>
        <Button variant="outline" fullWidth onClick={() => navigate("/tools/heart-health/quick")}>Start Free</Button>
      </Card>
      <Card className="text-center border-2 border-teal-deep relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge color="teal">Most Popular</Badge></div>
        <h3 className="text-2xl font-bold text-charcoal mt-3 mb-1">$9.99</h3>
        <p className="text-sm text-gray-400 mb-6">per month</p>
        <ul className="text-sm text-gray-600 space-y-3 mb-6 text-left">
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" />Everything in Free</li>
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" />Detailed heart assessment</li>
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" />Body fat prediction</li>
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" />Saved history & tracking</li>
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" />2 parent profiles</li>
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" />Advanced recommendations</li>
        </ul>
        <Button variant="primary" fullWidth onClick={() => alert("Mock payment flow would start")}>Upgrade to Member</Button>
      </Card>
      <Card className="text-center">
        <Badge color="amber">One-Time</Badge>
        <h3 className="text-2xl font-bold text-charcoal mt-3 mb-1">$4.99</h3>
        <p className="text-sm text-gray-400 mb-6">per detailed report</p>
        <ul className="text-sm text-gray-600 space-y-3 mb-6 text-left">
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" />Single detailed assessment</li>
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" />Full report download</li>
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-green-500" />Product recommendations</li>
          <li className="flex items-center gap-2"><Icon name="x" size={14} className="text-gray-300" /><span className="text-gray-400">No saved history</span></li>
          <li className="flex items-center gap-2"><Icon name="x" size={14} className="text-gray-300" /><span className="text-gray-400">No parent profiles</span></li>
          <li className="flex items-center gap-2"><Icon name="x" size={14} className="text-gray-300" /><span className="text-gray-400">No body fat tool</span></li>
        </ul>
        <Button variant="amber" fullWidth onClick={() => alert("Mock payment flow would start")}>Pay Once</Button>
      </Card>
    </div>
    <Disclaimer type="general" className="mt-8" />
  </div>
);


