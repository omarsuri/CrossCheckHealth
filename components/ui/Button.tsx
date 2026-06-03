import React from "react";
import { Icon } from "./Icon";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "amber" | "aqua";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  children: React.ReactNode;
  variant?: ButtonVariant | string;
  size?: ButtonSize | string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
};

export const Button = ({ children, variant = "primary", size = "md", className = "", onClick, disabled = false, icon, fullWidth = false, type = "button" }: ButtonProps) => {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-cream";
  const sizes = { sm: "px-3 py-2 text-sm", md: "px-5 py-3 text-base", lg: "px-8 py-4 text-lg" };
  const variants = {
    primary: "bg-ink text-cream hover:bg-ink-soft focus:ring-aqua",
    secondary: "bg-cream text-ink border border-ink/15 hover:border-ink/40 hover:bg-cream-warm focus:ring-ink/30",
    outline: "bg-white/60 text-ink border border-ink/10 hover:border-aqua-deep hover:text-aqua-deep hover:bg-aqua-light/60 focus:ring-aqua/30",
    ghost: "bg-transparent text-ink/65 hover:bg-cream-warm hover:text-ink",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
    amber: "bg-terracotta-deep text-white hover:bg-terracotta-deep/90 focus:ring-terracotta",
    aqua: "bg-aqua text-ink hover:bg-aqua-soft focus:ring-aqua-deep",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${fullWidth ? "w-full" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      {icon && <Icon name={icon} size={size === "lg" ? 22 : 18} />}
      {children}
    </button>
  );
};

export default Button;
