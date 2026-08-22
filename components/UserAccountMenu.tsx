import React, { useState, useRef, useEffect } from "react";
import { User } from "firebase/auth";

interface UserAccountMenuProps {
  user: User | null;
  isLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenMyCases: () => void;
}

export const UserAccountMenu: React.FC<UserAccountMenuProps> = ({
  user,
  isLoading,
  onSignIn,
  onSignOut,
  onOpenMyCases,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (isLoading) {
    return (
      <div className="h-8 w-28 rounded-full bg-surface-container border border-outline-variant animate-pulse" />
    );
  }

  if (!user) {
    return (
      <button
        id="google-signin-header-btn"
        type="button"
        onClick={onSignIn}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant hover:bg-surface-container-high hover:border-outline text-xs font-semibold text-on-surface shadow-2xs transition-all active:scale-95 cursor-pointer"
        title="Sign in with your Google account to save cases and documents"
      >
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
        <span className="hidden sm:inline">Continue with Google</span>
        <span className="sm:hidden">Sign In</span>
      </button>
    );
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "Citizen";
  const userPhoto = user.photoURL;
  const initial = (displayName[0] || "C").toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Account Control Pill */}
      <button
        id="user-account-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-surface-container border border-outline-variant hover:bg-surface-container-high hover:border-outline text-xs font-semibold text-on-surface shadow-2xs transition-all cursor-pointer"
        title={`Signed in as ${user.email || displayName}`}
      >
        {userPhoto ? (
          <img
            src={userPhoto}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="w-6 h-6 rounded-full object-cover border border-outline-variant"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center border border-primary/30">
            {initial}
          </div>
        )}
        <span className="max-w-[100px] sm:max-w-[140px] truncate text-xs">
          {displayName}
        </span>
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-200">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
          {/* User Details Header */}
          <div className="p-2.5 rounded-xl bg-surface-container-low mb-1 flex items-center gap-3">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-outline-variant shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold text-base flex items-center justify-center shrink-0 border border-primary/30">
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-xs text-on-surface truncate leading-snug">
                {displayName}
              </p>
              <p className="text-[11px] text-on-surface-variant truncate font-mono mt-0.5">
                {user.email || `UID: ${user.uid.slice(0, 8)}...`}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            {/* My Cases Button */}
            <button
              id="dropdown-my-cases-btn"
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenMyCases();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">folder</span>
              <span>My Cases</span>
            </button>

            {/* Sign Out Button */}
            <button
              id="dropdown-signout-btn"
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-error hover:bg-error-container/40 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
