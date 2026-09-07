"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, ExternalLink, ArrowUpRight, Filter, ShieldAlert } from "lucide-react";
import { AppStore } from "@/lib/store";
import { Detection } from "@licensehunter/types";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";

export default function DetectionsPage() {
  const store = AppStore.getInstance();
  const [detections, setDetections] = useState<Detection[]>(store.detections);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    return store.subscribe(() => {
      setDetections([...store.detections]);
    });
  }, [store]);

  const filteredDetections = detections.filter((d) => {
    if (filter === "ALL") return true;
    return d.status === filter;
  });

  return (
    <div className="space-y-8">
      <LegalDisclaimer />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Potential Unauthorized Usage
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Machine-detected content similarities across indexed platforms and decentralized storage.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-surface border border-surfaceBorder rounded-lg p-1 text-xs">
          {["ALL", "PENDING_REVIEW", "VERIFIED", "OFFER_CREATED", "SETTLED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                filter === f
                  ? "bg-brandCyan text-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {filteredDetections.length === 0 ? (
        <Card className="text-center py-16 space-y-3 border-dashed">
          <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Detections Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No potential unauthorized usage currently matches this filter.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDetections.map((detection) => (
            <Card
              key={detection.id}
              className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 hover:border-slate-700 transition-all"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-bold text-white tracking-tight">
                    {detection.assetName}
                  </span>
                  <StatusPill status={detection.status} isDemo={detection.isDemo} />
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 truncate">
                  <span className="text-slate-500">Target URL:</span>
                  <a
                    href={detection.matchedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-brandCyan underline truncate flex items-center gap-1"
                  >
                    {detection.matchedUrl} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                  <span>
                    Similarity:{" "}
                    <strong className="text-emerald-400 text-sm">
                      {detection.similarityScore}%
                    </strong>
                  </span>
                  <span>&bull;</span>
                  <span>
                    Confidence:{" "}
                    <strong className="text-brandCyan">{detection.confidence}</strong>
                  </span>
                  <span>&bull;</span>
                  <span className="text-slate-500">
                    Detected: {new Date(detection.detectedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <Link href={`/detections/${detection.id}`}>
                  <Button variant="primary" size="sm" className="gap-1.5">
                    <span>Investigate Evidence</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
