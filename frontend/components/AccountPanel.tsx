"use client";

import { useState } from "react";
import { AlertCircle, ExternalLink, LogOut, User } from "lucide-react";
import { useWallet } from "@/lib/genlayer/wallet";
import { error, userRejected } from "@/lib/utils/toast";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

const METAMASK_INSTALL_URL = "https://metamask.io/download/";

export function AccountPanel() {
  const {
    address,
    isConnected,
    isMetaMaskInstalled,
    isOnCorrectNetwork,
    isLoading,
    connectWallet,
    disconnectWallet,
    switchWalletAccount,
  } = useWallet();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleConnect = async () => {
    if (!isMetaMaskInstalled) {
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionError("");
      await connectWallet();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      setConnectionError(err.message || "Failed to connect to MetaMask");

      if (err.message?.includes("rejected")) {
        userRejected("Connection cancelled");
      } else {
        error("Failed to connect wallet", {
          description: err.message || "Check your MetaMask and try again."
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setIsModalOpen(false);
  };

  const handleSwitchAccount = async () => {
    try {
      setIsSwitching(true);
      setConnectionError("");
      await switchWalletAccount();
      // Keep modal open to show new account info
    } catch (err: any) {
      console.error("Failed to switch account:", err);

      // Don't show error if user cancelled
      if (!err.message?.includes("rejected")) {
        setConnectionError(err.message || "Failed to switch account");
        error("Failed to switch account", {
          description: err.message || "Please try again."
        });
      } else {
        userRejected("Account switch cancelled");
      }
    } finally {
      setIsSwitching(false);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button size="sm" disabled={isLoading}>
            <User />
            Connect wallet
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <p className="t-label">Wallet</p>
            <DialogTitle className="display-wide text-2xl">Connect to GenLayer</DialogTitle>
            <DialogDescription>Connect MetaMask to pay licenses, file claims, and withdraw earnings.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {!isMetaMaskInstalled ? (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>MetaMask not detected</AlertTitle>
                  <AlertDescription>
                    Install MetaMask to continue. It is a browser wallet that lets you sign GenLayer transactions.
                  </AlertDescription>
                </Alert>

                <Button onClick={() => window.open(METAMASK_INSTALL_URL, "_blank")} size="lg" className="w-full">
                  <ExternalLink />
                  Install MetaMask
                </Button>

                <p className="border border-line p-4 text-xs text-muted-foreground">
                  After installing MetaMask, refresh this page and connect again.
                </p>
              </>
            ) : (
              <>
                <Button onClick={handleConnect} size="lg" className="w-full" disabled={isConnecting}>
                  <User />
                  {isConnecting ? "Connecting…" : "Connect MetaMask"}
                </Button>

                {connectionError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connection error</AlertTitle>
                    <AlertDescription>{connectionError}</AlertDescription>
                  </Alert>
                )}

                <div className="border border-line p-4 text-xs text-muted-foreground">
                  <p>MetaMask will ask you to:</p>
                  <ol className="mt-2 list-inside list-decimal space-y-1">
                    <li>Connect your wallet to this site</li>
                    <li>Add the GenLayer Studio Next network</li>
                    <li>Switch to that network</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Connected state
  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 border border-line px-3 py-1.5 text-xs transition-colors hover:border-signal"
          aria-label="Wallet details"
        >
          <span className={`h-2 w-2 rounded-full ${isOnCorrectNetwork ? "bg-mint" : "bg-signal"}`} aria-hidden="true" />
          <AddressDisplay address={address} maxLength={12} />
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <p className="t-label">Wallet</p>
          <DialogTitle className="display-wide text-2xl">Wallet details</DialogTitle>
          <DialogDescription>Your connected MetaMask wallet.</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-2 border border-line p-4">
            <p className="t-label">Address</p>
            <code className="break-all text-sm">{address}</code>
          </div>

          <div className="space-y-2 border border-line p-4">
            <p className="t-label">Network</p>
            <p className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${isOnCorrectNetwork ? "bg-mint" : "bg-signal"}`} aria-hidden="true" />
              {isOnCorrectNetwork ? "Connected to GenLayer Studio Next" : "Wrong network"}
            </p>
          </div>

          {!isOnCorrectNetwork && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Wrong network</AlertTitle>
              <AlertDescription>Switch to GenLayer Studio Next in MetaMask, or reconnect.</AlertDescription>
            </Alert>
          )}

          {connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 border-t border-line pt-4">
            <Button onClick={handleSwitchAccount} variant="outline" className="w-full" disabled={isSwitching || isLoading}>
              <User />
              {isSwitching ? "Switching…" : "Switch account"}
            </Button>

            <Button
              onClick={handleDisconnect}
              variant="outline"
              className="w-full text-destructive hover:border-destructive hover:text-destructive"
              disabled={isSwitching || isLoading}
            >
              <LogOut />
              Disconnect wallet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
