import React from "react";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  hover?: boolean;
};

export const Card = ({ children, className = "", onClick, hover = true }: CardProps) => (
  <div onClick={onClick} className={`bg-white rounded-3xl shadow-glass border border-ink/5 p-6 slide-up ${hover ? "card-lift" : ""} ${onClick ? "cursor-pointer" : ""} ${className}`}>
    {children}
  </div>
);

export default Card;
