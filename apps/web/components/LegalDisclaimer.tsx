import React from "react";
import { AlertCircle } from "lucide-react";

export const LegalDisclaimer: React.FC = () => {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-950/20 border border-amber-800/40 rounded-lg text-amber-300/90 text-xs">
      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
      <p>
        <strong className="font-semibold uppercase tracking-wider">Demo Document:</strong> Not legal advice or legally served notice. LicenseHunter provides cryptographic evidence anchoring and micro-licensing rails for potential unauthorized usage.
      </p>
    </div>
  );
};
