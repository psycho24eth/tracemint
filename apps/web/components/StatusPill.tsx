import React from "react";

interface StatusPillProps {
  status: string;
  isDemo?: boolean;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, isDemo }) => {
  const getBadgeClass = (s: string) => {
    switch (s.toUpperCase()) {
      case "ACTIVE":
      case "VERIFIED":
      case "CONFIRMED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "HIGH":
      case "OFFER_CREATED":
        return "bg-brandCyan/10 text-brandCyan border-brandCyan/30";
      case "PENDING":
      case "PENDING_REVIEW":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "EXPIRED":
      case "CANCELLED":
      case "DISMISSED":
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
      default:
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      {isDemo && (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 uppercase tracking-wider">
          DEMO
        </span>
      )}
      <span
        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border uppercase tracking-wider ${getBadgeClass(
          status
        )}`}
      >
        {status.replace(/_/g, " ")}
      </span>
    </div>
  );
};
