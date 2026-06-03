import React from "react";

export const Badge = ({ children, color = "teal", className = "" }) => {
  const colors = {
    teal: "bg-aqua-light text-aqua-deep border border-aqua-soft/50",
    green: "bg-green-50 text-green-700 border border-green-100",
    amber: "bg-terracotta-soft text-terracotta-deep border border-terracotta/40",
    red: "bg-red-50 text-red-700 border border-red-100",
    blue: "bg-aqua-light text-ink-light border border-aqua-soft/50",
    gray: "bg-cream-warm text-ink/65 border border-ink/10",
    navy: "bg-ink/10 text-ink border border-ink/10",
    cream: "bg-cream-warm text-ink border border-ink/10",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.teal} ${className}`}>{children}</span>;
};

export default Badge;
