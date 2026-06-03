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

export const ToolsPage = ({ navigate }) => {
  const toolTabs = [
    { name: "SwasthyaSathi", path: "/tools/products", icon: "search" },
    { name: "RaktaSetu", path: "/tools/raktasetu", icon: "activity" },
    { name: "Checks", path: "/tools/heart-health", icon: "heart" },
    { name: "Exercise", path: "/tools/body-fat", icon: "activity" },
    { name: "Tracker", path: "/dashboard", icon: "trendingUp" },
    { name: "Parivar", path: "/dashboard/parents", icon: "users" },
  ];
  const tools = [
    { title: "SwasthyaSathi", desc: "Compare health products by science, safety, value, and family suitability.", path: "/tools/products", icon: "search", iconBg: "bg-blue-50", iconColor: "text-navy", badge: "Free to Browse", badgeColor: "blue" },
    { title: "RaktaSetu", desc: "Compare blood tests by biomarkers, hidden charges, lab quality, and preventive value.", path: "/tools/raktasetu", icon: "activity", iconBg: "bg-red-50", iconColor: "text-red-500", badge: "New", badgeColor: "red" },
    { title: "PCOS Reflection", desc: "Educational PCOS feature reflection with consent-first summary, not a diagnosis.", path: "/tools/pcos", icon: "fileText", iconBg: "bg-terracotta-soft", iconColor: "text-terracotta-deep", badge: "Unlocked", badgeColor: "amber" },
    { title: "Heart Health", desc: "Quick and detailed checks for heart risk awareness.", path: "/tools/heart-health", icon: "heart", iconBg: "bg-red-50", iconColor: "text-red-500", badge: "Free Quick Check", badgeColor: "green" },
    { title: "Body Fat & Fitness", desc: "AI-powered body composition forecast and recommendations.", path: "/tools/body-fat", icon: "scale", iconBg: "bg-teal-soft", iconColor: "text-teal-deep", badge: "Member Tool", badgeColor: "teal" },
    { title: "Health Tracker", desc: "View latest assessment data, progress bars, and next suggested checks.", path: "/dashboard", icon: "trendingUp", iconBg: "bg-green-50", iconColor: "text-green-600", badge: "Dashboard", badgeColor: "green" },
    { title: "Assessment History", desc: "Open saved results from heart, body, and product checks.", path: "/dashboard/history", icon: "clock", iconBg: "bg-purple-50", iconColor: "text-purple-600", badge: "Saved Data", badgeColor: "gray" },
    { title: "Parivar Profiles", desc: "Unlock parent and family profiles with plan-based pricing.", path: "/dashboard/parents", icon: "users", iconBg: "bg-amber-50", iconColor: "text-amber-600", badge: "From Rs 199/mo", badgeColor: "amber" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 slide-up">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-charcoal mb-3">Health Tools</h1>
        <p className="text-gray-500">Choose the right tool for your needs</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {toolTabs.map(tab => (
          <button key={tab.name} onClick={() => navigate(tab.path)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:border-teal-deep hover:text-teal-deep transition-colors">
            <Icon name={tab.icon} size={16} />{tab.name}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map(tool => (
          <Card key={tool.title} className="text-center cursor-pointer" onClick={() => navigate(tool.path)}>
            <div className={`w-16 h-16 ${tool.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
              <Icon name={tool.icon} size={32} className={tool.iconColor} />
            </div>
            <h3 className="text-xl font-bold text-charcoal mb-2">{tool.title}</h3>
            <p className="text-sm text-gray-500 mb-4">{tool.desc}</p>
            <Badge color={tool.badgeColor}>{tool.badge}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
};


