import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "", ...props }) => {
  return (
    <div
      className={`bg-surface/90 backdrop-blur border border-surfaceBorder rounded-xl p-5 shadow-xl transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
