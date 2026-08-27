import React, { useState } from "react";
import {
  Cloud,
  CheckCircle2,
  Database,
  ShieldCheck,
  LogOut,
  UserCheck,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { User } from "firebase/auth";
import { signInWithGoogle, logOut } from "../services/firebase";

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  totalSynced: number;
  isSyncing: boolean;
  onManualSync?: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  totalSynced,
  isSyncing,
  onManualSync,
}) => {
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error("Google Sign-In error:", err);
      setAuthError(err.message || "Failed to sign in with Google");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await logOut();
    } catch (err: any) {
      console.error("Sign-out error:", err);
      setAuthError(err.message || "Failed to sign out");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-300 dark:border-neutral-700 max-w-md w-full p-6 shadow-2xl space-y-5 animate-fadeIn text-black dark:text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Cloud Firestore Sync</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Encrypted & Isolated Cloud Storage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-black text-white border border-black rounded-lg cursor-pointer transition-none"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium">
              <Database className="w-4 h-4 text-black dark:text-white" />
              <span>Storage Mode</span>
            </div>
            {user ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-900 dark:text-neutral-100 bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Cloud Firestore Sync
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-900 dark:text-neutral-100 bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-neutral-500" /> Local Offline Storage
              </span>
            )}
          </div>

          <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-neutral-800">
            <span>Saved Reflections:</span>
            <span className="font-mono font-bold text-black dark:text-white">
              {totalSynced} entries
            </span>
          </div>
        </div>

        {/* User Account / Identity Section */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-black dark:text-white" />
              <span className="text-xs font-semibold">Account Identity</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-bold">
              {user ? (user.isAnonymous ? "Anonymous User" : "Google Account") : "Guest Mode"}
            </span>
          </div>

          <div className="text-xs space-y-1">
            {user?.email ? (
              <p className="font-medium text-black dark:text-white truncate">
                {user.email}
              </p>
            ) : user ? (
              <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                Session UID: {user.uid}
              </p>
            ) : (
              <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                Reflections are securely saved locally on your device. Sign in with Google to enable cross-device Cloud Firestore sync.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col gap-2">
            {!user || user.isAnonymous ? (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="w-full py-2.5 px-3 rounded-xl bg-black text-white border border-black text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-none"
              >
                {authLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                )}
                <span className="text-white">Sign In with Google for Cloud Sync</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={authLoading}
                className="w-full py-2 px-3 rounded-xl bg-black text-white border border-black text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-none"
              >
                <LogOut className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Sign Out / Switch to Guest</span>
              </button>
            )}

            {user && onManualSync && (
              <button
                type="button"
                onClick={onManualSync}
                disabled={isSyncing}
                className="w-full py-2 px-3 rounded-xl bg-black text-white border border-black text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-none"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-white ${isSyncing ? "animate-spin" : ""}`} />
                <span className="text-white">{isSyncing ? "Syncing..." : "Sync Local & Cloud Now"}</span>
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs flex items-center gap-2 text-black dark:text-white">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Close button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-black text-white border border-black rounded-xl text-xs font-medium cursor-pointer transition-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
