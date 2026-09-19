"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TourProvider } from "@/components/tour/GuidedTour";
import { WalletModal } from "@/components/wallet/WalletModal";
import { WalletProvider } from "@/lib/genlayer/WalletProvider";
import { DemoModeProvider } from "@/lib/demo/DemoModeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  // Use useState to ensure QueryClient is only created once per component lifecycle
  // This prevents the client from being recreated on every render
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <DemoModeProvider>
          <TourProvider>
            {children}
            <WalletModal />
          </TourProvider>
        </DemoModeProvider>
      </WalletProvider>
      <Toaster
        position="top-right"
        theme="dark"
        richColors
        closeButton
        offset="80px"
        toastOptions={{
          style: {
            background: 'var(--card)',
            border: '1px solid var(--line-strong)',
            borderRadius: '0',
            color: 'var(--foreground)',
            fontFamily: 'var(--font-mono)',
            boxShadow: '6px 6px 0 rgb(255 90 31 / 0.85)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
