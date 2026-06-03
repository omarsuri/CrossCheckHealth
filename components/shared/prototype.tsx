"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export const track = (eventName, properties = {}) => {
  console.log("[analytics]", { event: eventName, ...properties });
};

export const useTilt = ({ max = 6, depth = 24 } = {}) => {
  const ref = useRef(null);
  const onMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--ry", `${x * max * 2}deg`);
    el.style.setProperty("--rx", `${-y * max * 2}deg`);
    el.style.setProperty("--tz", `${depth}px`);
  };
  const onMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--tz", "0px");
  };
  return { ref, onMouseMove, onMouseLeave };
};

export const useMagnetic = ({ strength = 0.2, radius = 80 } = {}) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      el.style.transform = "none";
    };
    const onLeave = () => { el.style.transform = "none"; };
    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [strength, radius]);
  return ref;
};

export const useScrollReveal = () => {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = root.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(item => item.classList.add("in-view"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  return ref;
};

export const useMouseParallax = (strength = 12) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => {
      setPos({
        x: (e.clientX / window.innerWidth - 0.5) * strength,
        y: (e.clientY / window.innerHeight - 0.5) * strength,
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [strength]);
  return pos;
};

export const TiltCard = ({ children, className = "", max = 5, depth = 20, ...rest }) => {
  const tilt = useTilt({ max, depth });
  return (
    <div ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave} className={`tilt-card ${className}`} {...rest}>
      <div className="tilt-card-inner">{children}</div>
    </div>
  );
};

export const MagneticWrap = ({ children, strength = 0.2, className = "" }) => {
  const ref = useMagnetic({ strength });
  return <div ref={ref} className={`magnetic ${className}`}>{children}</div>;
};

// ===================== ICONS =====================


// ===================== MOCK DATA =====================









// ===================== UTILITY COMPONENTS =====================










export const ScoreRing = ({ score, size = 120, label, color = "teal" }) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colors = { teal: "#0E7C7B", green: "#16a34a", amber: "#C97A5E", red: "#dc2626", navy: "#0B2545" };
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth="8" fill="none" />
          <circle cx={size / 2} cy={size / 2} r={radius} stroke={colors[color]} strokeWidth="8" fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-charcoal">{score}</span>
        </div>
      </div>
      {label && <span className="text-sm text-gray-500 mt-2">{label}</span>}
    </div>
  );
};

export const ECGBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 400">
      <path d="M0,200 L100,200 L120,160 L140,240 L160,120 L180,280 L200,200 L300,200 L320,160 L340,240 L360,120 L380,280 L400,200 L1200,200"
        stroke="#0A6C74" strokeWidth="2" fill="none" className="ecg-line" />
    </svg>
  </div>
);

export const ShareButtons = () => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" icon="messageCircle" onClick={() => alert("WhatsApp sharing would open here")}>WhatsApp</Button>
      <Button variant="outline" size="sm" icon="share" onClick={() => alert("Facebook sharing would open here")}>Facebook</Button>
      <Button variant="outline" size="sm" icon="copy" onClick={handleCopy}>{copied ? "Copied!" : "Copy Link"}</Button>
      <Button variant="outline" size="sm" icon="download" onClick={() => alert("Share card download would start")}>Download Card</Button>
    </div>
  );
};

// ===================== MODALS =====================



