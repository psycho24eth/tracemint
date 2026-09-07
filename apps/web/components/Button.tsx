import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brandCyan/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variantStyles = {
    primary: "bg-gradient-to-r from-brandCyan to-brandViolet text-black font-semibold hover:brightness-110 shadow-lg shadow-brandCyan/10 border border-brandCyan/30",
    secondary: "bg-surface text-slate-100 hover:bg-slate-800 border border-surfaceBorder",
    outline: "border border-brandCyan/40 text-brandCyan hover:bg-brandCyan/10",
    danger: "bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/50",
    ghost: "text-slate-400 hover:text-white hover:bg-surface/50",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${base} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin text-current" />}
      {children}
    </button>
  );
};
