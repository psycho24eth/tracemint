"use client";

import { useState } from "react";
import type { Claim } from "@/lib/contracts/LicenseHunter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WriteAction } from "@/components/WriteAction";
import { actingAddress, walletOnlyReason } from "@/lib/actor";
import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { useWallet } from "@/lib/genlayer/wallet";

export function DisputeForm({ claim }: { claim: Claim }) {
  const { role } = useDemoMode();
  const { address } = useWallet();
  const [proofUrl, setProofUrl] = useState("");
  const [showError, setShowError] = useState(false);

  // When the agent read a wallet address off the page, the contract lets only that wallet answer the notice.
  const notOnPage = walletOnlyReason({
    expected: claim.walletOnPage,
    actor: actingAddress(role, address),
    action: "dispute this notice",
    inDemoMode: role !== null,
  });

  const isValid = proofUrl.startsWith("https://") && !proofUrl.includes(" ");

  const handleBeforeSubmit = () => {
    if (!isValid) {
      setShowError(true);
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-4">
      <p className="t-label text-foreground">Dispute this notice</p>
      <div className="space-y-2">
        <Label htmlFor="proof-url">Proof URL</Label>
        <Input
          id="proof-url"
          type="url"
          placeholder="https://…"
          value={proofUrl}
          onChange={(e) => {
            setProofUrl(e.target.value);
            setShowError(false);
          }}
          aria-invalid={showError}
        />
        <p className="text-xs text-muted-foreground">Link a page that shows the creator's permission, such as a licence or an email.</p>
        {showError && <p className="text-xs text-destructive">The proof URL must start with https:// and contain no spaces.</p>}
      </div>

      <WriteAction
        method="dispute"
        args={[claim.id, proofUrl]}
        label="Dispute with proof"
        variant="outline"
        onBeforeSubmit={handleBeforeSubmit}
        unavailable={notOnPage}
      />

      <p className="text-xs text-muted-foreground">Only the wallet shown on the page can dispute, and each notice can be disputed once.</p>
    </div>
  );
}
