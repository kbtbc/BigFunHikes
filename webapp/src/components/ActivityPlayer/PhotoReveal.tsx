/**
 * PhotoReveal - Elegant photo reveal animation during activity playback
 * Shows a full-viewport photo with smooth CSS transitions
 * Supports auto-dismiss (during playback) and manual dismiss (when paused)
 */

import { useEffect, useState, useCallback } from "react";
import { Camera, X } from "lucide-react";
import type { ActivityPhoto } from "@/lib/activity-data-parser";

interface PhotoRevealProps {
  photo: ActivityPhoto | null;
  onComplete: () => void;
  displayDuration?: number; // ms
  manualDismiss?: boolean; // If true, stays open until clicked
}

export function PhotoReveal({
  photo,
  onComplete,
  displayDuration = 3000,
  manualDismiss = false
}: PhotoRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      handleComplete();
    }, 500);
  }, [handleComplete]);

  useEffect(() => {
    if (!photo) {
      setIsVisible(false);
      setIsExiting(false);
      return;
    }

    // Start enter animation immediately
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // If manual dismiss, don't set up auto timers
    if (manualDismiss) {
      return;
    }

    // Start exit animation (fade out takes 500ms)
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, displayDuration);

    // Complete after fade out finishes
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      handleComplete();
    }, displayDuration + 500);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [photo, displayDuration, handleComplete, manualDismiss]);

  if (!photo) return null;

  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        isVisible && !isExiting ? "opacity-100" : "opacity-0"
      }`}
      style={{ pointerEvents: isVisible ? "auto" : "none" }}
      onClick={manualDismiss ? handleDismiss : undefined}
    >
      {/* Backdrop blur */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          isVisible && !isExiting ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Photo container */}
      <div
        className={`relative z-10 w-[90%] h-[85%] max-w-2xl max-h-[500px] rounded-xl overflow-hidden shadow-2xl transition-all ease-out flex items-center justify-center bg-black/50 ${
          isVisible && !isExiting
            ? "scale-100 opacity-100 translate-y-0 duration-250"
            : isExiting
            ? "scale-95 opacity-0 -translate-y-8 duration-500"
            : "scale-85 opacity-0 translate-y-8 duration-250"
        }`}
      >
        {/* Photo - object-contain to show full image without cropping */}
        <img
          src={photo.url}
          alt={photo.caption || "Trail photo"}
          className="max-w-full max-h-full object-contain"
        />

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Caption */}
        {photo.caption && (
          <div
            className={`absolute bottom-4 left-4 right-4 transition-all duration-200 delay-100 ${
              isVisible && !isExiting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            }`}
          >
            <p className="text-white text-sm font-medium drop-shadow-lg">
              {photo.caption}
            </p>
          </div>
        )}

        {/* Camera icon badge */}
        <div
          className={`absolute top-3 left-3 bg-white/20 backdrop-blur-md rounded-full p-2 transition-all duration-200 delay-75 ${
            isVisible && !isExiting
              ? "opacity-100 scale-100"
              : "opacity-0 scale-0"
          }`}
        >
          <Camera className="w-4 h-4 text-white" />
        </div>

        {/* Close button for manual dismiss */}
        {manualDismiss && (
          <button
            onClick={handleDismiss}
            className={`absolute top-3 right-3 bg-white/20 backdrop-blur-md rounded-full p-2 transition-all duration-200 delay-75 hover:bg-white/30 ${
              isVisible && !isExiting
                ? "opacity-100 scale-100"
                : "opacity-0 scale-0"
            }`}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Progress indicator - only show for auto dismiss */}
        {!manualDismiss && (
          <div
            className="absolute bottom-0 left-0 h-1 bg-white/90"
            style={{
              width: isVisible && !isExiting ? "100%" : "0%",
              transition: isVisible && !isExiting ? `width ${displayDuration}ms linear` : "none"
            }}
          />
        )}
      </div>

      {/* Decorative blur elements */}
      <div
        className={`absolute top-1/4 left-1/4 w-32 h-32 bg-primary/30 rounded-full blur-3xl transition-all duration-300 ${
          isVisible && !isExiting ? "opacity-50 scale-100" : "opacity-0 scale-0"
        }`}
      />
      <div
        className={`absolute bottom-1/4 right-1/4 w-24 h-24 bg-white/20 rounded-full blur-2xl transition-all duration-300 delay-50 ${
          isVisible && !isExiting ? "opacity-30 scale-100" : "opacity-0 scale-0"
        }`}
      />

      {/* Tap to close hint for manual dismiss */}
      {manualDismiss && (
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs transition-opacity duration-300 delay-500 ${
            isVisible && !isExiting ? "opacity-100" : "opacity-0"
          }`}
        >
          Tap anywhere to close
        </div>
      )}
    </div>
  );
}
