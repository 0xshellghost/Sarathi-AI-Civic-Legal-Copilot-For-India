import React, { useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (method?: "popup" | "redirect") => Promise<void>;
  title?: string;
  description?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSignIn,
  title = "Sign in to save your case",
  description = "Connect with your Google account to save your case roadmap, download drafted statutory RTI applications, and sync your legal records across devices.",
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRedirectOption, setShowRedirectOption] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async (method: "popup" | "redirect" = "popup") => {
    try {
      setIsSigningIn(true);
      setErrorMessage(null);
      await onSignIn(method);
      if (method === "popup") {
        onClose();
      }
    } catch (err: any) {
      console.warn("AuthModal sign-in notice:", err);
      const msg = err?.message || "Google sign-in couldn't be completed. Please try again.";
      setErrorMessage(msg);
      setShowRedirectOption(true);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSigningIn}
          className="absolute top-4 right-4 p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Icon & Brand Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl border border-primary/20">
            <span className="material-symbols-outlined text-[22px]">gavel</span>
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-on-surface leading-tight">
              SARATHI <span className="text-primary font-normal text-sm">सारथी</span>
            </h3>
            <p className="text-[10px] text-on-surface-variant font-mono">Civic & Legal Copilot</p>
          </div>
        </div>

        {/* Title & Description */}
        <h4 className="font-semibold text-sm text-on-surface mb-1.5">{title}</h4>
        <p className="text-xs text-on-surface-variant leading-relaxed mb-5">
          {description}
        </p>

        {/* Error message with user-friendly text */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-error-container/40 border border-error/30 text-error text-xs flex flex-col gap-1.5">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            id="auth-modal-google-btn"
            type="button"
            disabled={isSigningIn}
            onClick={() => handleSignIn("popup")}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline text-xs font-semibold text-on-surface shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSigningIn ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{isSigningIn ? "Signing in with Google..." : "Continue with Google"}</span>
          </button>

          {showRedirectOption && (
            <button
              id="auth-modal-redirect-btn"
              type="button"
              disabled={isSigningIn}
              onClick={() => handleSignIn("redirect")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-xs font-semibold text-primary transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              <span>Use Redirect Sign-In Flow</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={isSigningIn}
            className="w-full py-2 text-center text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            Continue exploring as guest
          </button>
        </div>
      </div>
    </div>
  );
};
