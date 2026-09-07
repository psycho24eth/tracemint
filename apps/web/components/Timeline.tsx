import React from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";

export interface TimelineStep {
  label: string;
  timestamp?: string;
  status: "COMPLETED" | "CURRENT" | "PENDING";
  description?: string;
}

interface TimelineProps {
  steps: TimelineStep[];
}

export const Timeline: React.FC<TimelineProps> = ({ steps }) => {
  return (
    <div className="space-y-4">
      {steps.map((step, idx) => {
        const isCompleted = step.status === "COMPLETED";
        const isCurrent = step.status === "CURRENT";

        return (
          <div key={idx} className="flex items-start gap-3 relative">
            {idx < steps.length - 1 && (
              <div
                className={`absolute left-3.5 top-7 bottom-0 w-0.5 ${
                  isCompleted ? "bg-brandCyan" : "bg-surfaceBorder"
                }`}
              />
            )}
            <div className="z-10 flex items-center justify-center w-7 h-7 rounded-full bg-surface border border-surfaceBorder">
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : isCurrent ? (
                <div className="w-2.5 h-2.5 rounded-full bg-brandCyan animate-pulse" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-600" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isCompleted
                      ? "text-white"
                      : isCurrent
                      ? "text-brandCyan font-semibold"
                      : "text-slate-500"
                  }`}
                >
                  {step.label}
                </span>
                {step.timestamp && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {step.timestamp}
                  </span>
                )}
              </div>
              {step.description && (
                <p className="mt-1 text-xs text-slate-400">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
