"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FileCheck, ExternalLink, ArrowUpRight, DollarSign, Calendar } from "lucide-react";
import { AppStore } from "@/lib/store";
import { License, LicenseOffer } from "@licensehunter/types";
import { formatWeiToEther } from "@licensehunter/shared";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { HashDisplay } from "@/components/HashDisplay";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";

export default function LicensesOverviewPage() {
  const store = AppStore.getInstance();
  const [licenses, setLicenses] = useState<License[]>(store.licenses);
  const [offers, setOffers] = useState<LicenseOffer[]>(store.offers);

  useEffect(() => {
    return store.subscribe(() => {
      setLicenses([...store.licenses]);
      setOffers([...store.offers]);
    });
  }, [store]);

  return (
    <div className="space-y-8">
      <LegalDisclaimer />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Micro-Licenses &amp; Offers
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Active on-chain licenses and open programmable settlement offers.
          </p>
        </div>
      </div>

      {/* Active Licenses List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-emerald-400" />
          Active Issued Licenses
        </h3>

        {licenses.length === 0 ? (
          <Card className="text-center py-12 border-dashed space-y-2">
            <FileCheck className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">No Licenses Purchased Yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When licensees accept offers and settle on-chain, verified licenses appear here with downloadable certificates.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {licenses.map((lic) => (
              <Card
                key={lic.id}
                className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-emerald-500/30"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-white text-base">
                      {lic.assetName}
                    </span>
                    <StatusPill status={lic.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
                    <span>Licensee: {lic.licenseeAddress.slice(0, 10)}...</span>
                    <span>&bull;</span>
                    <span>Fee: <strong className="text-emerald-400">{formatWeiToEther(lic.pricePaidWei)} ETH</strong></span>
                    <span>&bull;</span>
                    <span>Expires: {new Date(lic.expiresAt).toLocaleDateString()}</span>
                  </div>

                  <div className="pt-1">
                    <HashDisplay
                      hash={lic.purchaseTxHash}
                      label="Settlement Tx"
                      explorerUrl={`https://sepolia.etherscan.io/tx/${lic.purchaseTxHash}`}
                      truncate={true}
                    />
                  </div>
                </div>

                <Link href={`/licenses/${lic.id}`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <span>View Certificate</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Open Offers List */}
      <div className="space-y-4 pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-brandCyan" />
          Active License Offers (Awaiting Settlement)
        </h3>

        <div className="space-y-3">
          {offers.map((offer) => (
            <Card
              key={offer.id}
              className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-white text-base">
                    {offer.assetName}
                  </span>
                  <StatusPill status={offer.status} />
                </div>

                <p className="text-xs text-slate-400 font-mono line-clamp-1">
                  Terms: {offer.termsText}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400 pt-1">
                  <span>Price: <strong className="text-brandCyan">{formatWeiToEther(offer.priceWei)} ETH</strong></span>
                  <span>&bull;</span>
                  <span>Duration: {Math.round(offer.durationSeconds / 86400)} Days</span>
                  <span>&bull;</span>
                  <span>Expires: {new Date(offer.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/licenses/${offer.id}`}>
                  <Button size="sm" className="gap-1.5">
                    <span>Public Checkout Page</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
