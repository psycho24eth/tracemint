import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  highlight,
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-5 transition-all ${
        highlight
          ? "bg-gradient-to-br from-brandCyan/10 via-surface to-brandViolet/10 border-brandCyan/30 shadow-lg shadow-brandCyan/5"
          : "bg-surface/80 border-surfaceBorder"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
          {title}
        </span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="mt-3 text-2xl lg:text-3xl font-bold tracking-tight text-white">
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-slate-400 flex items-center gap-1">
          {subtitle}
        </div>
      )}
    </div>
  );
};
