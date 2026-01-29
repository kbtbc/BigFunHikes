/**
 * VideoReveal - Elegant video reveal during activity playback
 * Shows a thumbnail initially with a play icon badge overlay
 * When revealed, pauses timeline and plays the full video
 * Supports auto-dismiss (when video ends) and manual dismiss (when paused)
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { Video, X, Play, Pause, Volume2, VolumeX } from "lucide-react";

export interface ActivityVideo {
  id: string;
  url: string;
  thumbnailUrl: string;
  duration: number; // seconds
  caption?: string | null;
  lat?: number;
  lon?: number;
  timestamp?: number; // ms since activity start
}

interface VideoRevealProps {
  video: ActivityVideo | null;
  onComplete: () => void;
  manualDismiss?: boolean; // If true, stays open until dismissed
}

export function VideoReveal({
  video,
  onComplete,
  manualDismiss = false
}: VideoRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleDismiss = useCallback(() => {
    // Stop video and clear progress tracking
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      setShowThumbnail(true);
      setIsVideoPlaying(false);
      setVideoProgress(0);
      handleComplete();
    }, 500);
  }, [handleComplete]);

  // Start video playback when thumbnail is clicked
  const handleThumbnailClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowThumbnail(false);
    setIsVideoPlaying(true);

    // Start video playback
    if (videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  }, []);

  // Toggle play/pause
  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;

    if (isVideoPlaying) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    } else {
      videoRef.current.play().catch(console.error);
      setIsVideoPlaying(true);
    }
  }, [isVideoPlaying]);

  // Toggle mute
  const handleMuteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Handle video end
  const handleVideoEnded = useCallback(() => {
    setIsVideoPlaying(false);

    // Auto-dismiss when video ends (unless manual dismiss mode)
    if (!manualDismiss) {
      setTimeout(() => {
        handleDismiss();
      }, 500);
    }
  }, [manualDismiss, handleDismiss]);

  // Update progress
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && video) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(progress);
    }
  }, [video]);

  // Keyboard handler for dismissing with Escape
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleDismiss();
    } else if (e.key === " " && !showThumbnail) {
      e.preventDefault();
      if (videoRef.current) {
        if (isVideoPlaying) {
          videoRef.current.pause();
          setIsVideoPlaying(false);
        } else {
          videoRef.current.play().catch(console.error);
          setIsVideoPlaying(true);
        }
      }
    }
  }, [handleDismiss, showThumbnail, isVideoPlaying]);

  // Handle container click for manual dismiss
  const handleContainerClick = useCallback(() => {
    if (manualDismiss && !showThumbnail) {
      handleDismiss();
    }
  }, [manualDismiss, showThumbnail, handleDismiss]);

  useEffect(() => {
    if (!video) {
      setIsVisible(false);
      setIsExiting(false);
      setShowThumbnail(true);
      setIsVideoPlaying(false);
      setVideoProgress(0);
      return;
    }

    // Start enter animation immediately
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-play after a brief delay to show the thumbnail first
    if (!manualDismiss) {
      const autoPlayTimer = setTimeout(() => {
        setShowThumbnail(false);
        setIsVideoPlaying(true);
        if (videoRef.current) {
          videoRef.current.play().catch(console.error);
        }
      }, 800);

      return () => {
        clearTimeout(autoPlayTimer);
      };
    }
  }, [video, manualDismiss]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  if (!video) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Video player"
      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 motion-reduce:transition-none ${
        isVisible && !isExiting ? "opacity-100" : "opacity-0"
      }`}
      style={{ pointerEvents: isVisible ? "auto" : "none", zIndex: 200 }}
      onClick={handleContainerClick}
      onKeyDown={handleKeyDown}
      tabIndex={isVisible ? 0 : -1}
    >
      {/* Backdrop blur */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${
          isVisible && !isExiting ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* Video container */}
      <div
        className={`relative z-10 w-[90%] h-[85%] max-w-2xl max-h-[500px] rounded-xl overflow-hidden shadow-2xl ease-out flex items-center justify-center bg-black transition-[transform,opacity] motion-reduce:transition-none ${
          isVisible && !isExiting
            ? "scale-100 opacity-100 translate-y-0 duration-250"
            : isExiting
            ? "scale-95 opacity-0 -translate-y-8 duration-500"
            : "scale-85 opacity-0 translate-y-8 duration-250"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Thumbnail view with play button overlay */}
        {showThumbnail ? (
          <div
            className="relative w-full h-full cursor-pointer group"
            onClick={handleThumbnailClick}
          >
            <img
              src={video.thumbnailUrl}
              alt={video.caption || "Video thumbnail"}
              className="w-full h-full object-contain"
            />

            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
              </div>
            </div>
          </div>
        ) : (
          /* Video player view */
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src={video.url}
              className="w-full h-full object-contain"
              onEnded={handleVideoEnded}
              onTimeUpdate={handleTimeUpdate}
              playsInline
              muted={isMuted}
            />

            {/* Video controls overlay */}
            <div
              className="absolute inset-0 flex flex-col justify-end opacity-0 hover:opacity-100 transition-opacity duration-200"
              onClick={(e) => {
                e.stopPropagation();
                if (manualDismiss) {
                  handlePlayPause(e);
                }
              }}
            >
              {/* Gradient overlay at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

              {/* Progress bar */}
              <div className="relative z-10 px-4 pb-2">
                <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-[width] duration-100"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
              </div>

              {/* Control buttons */}
              <div className="relative z-10 flex items-center gap-3 px-4 pb-4">
                <button
                  onClick={handlePlayPause}
                  className="p-2 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label={isVideoPlaying ? "Pause video" : "Play video"}
                >
                  {isVideoPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleMuteToggle}
                  className="p-2 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>

                <div className="flex-1" />

                {/* Duration display */}
                <span className="text-white/80 text-sm tabular-nums">
                  {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(video.duration)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Gradient overlay at bottom for caption */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" aria-hidden="true" />

        {/* Caption */}
        {video.caption && (
          <div
            className={`absolute bottom-4 left-4 right-4 z-20 transition-[transform,opacity] duration-200 delay-100 motion-reduce:transition-none pointer-events-none ${
              isVisible && !isExiting
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            }`}
          >
            <p className="text-white text-sm font-medium drop-shadow-lg">
              {video.caption}
            </p>
          </div>
        )}

        {/* Video icon badge */}
        <div
          className={`absolute top-3 left-3 bg-white/20 backdrop-blur-md rounded-full p-2 transition-[transform,opacity] duration-200 delay-75 motion-reduce:transition-none ${
            isVisible && !isExiting
              ? "opacity-100 scale-100"
              : "opacity-0 scale-0"
          }`}
          aria-hidden="true"
        >
          <Video className="w-4 h-4 text-white" />
        </div>

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          aria-label="Close video"
          className={`absolute top-3 right-3 bg-white/20 backdrop-blur-md rounded-full p-2 transition-[transform,opacity] duration-200 delay-75 hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none ${
            isVisible && !isExiting
              ? "opacity-100 scale-100"
              : "opacity-0 scale-0"
          }`}
        >
          <X className="w-4 h-4 text-white" aria-hidden="true" />
        </button>
      </div>

      {/* Decorative blur elements */}
      <div
        className={`absolute top-1/4 left-1/4 w-32 h-32 bg-primary/30 rounded-full blur-3xl transition-[transform,opacity] duration-300 motion-reduce:hidden ${
          isVisible && !isExiting ? "opacity-50 scale-100" : "opacity-0 scale-0"
        }`}
        aria-hidden="true"
      />
      <div
        className={`absolute bottom-1/4 right-1/4 w-24 h-24 bg-white/20 rounded-full blur-2xl transition-[transform,opacity] duration-300 delay-50 motion-reduce:hidden ${
          isVisible && !isExiting ? "opacity-30 scale-100" : "opacity-0 scale-0"
        }`}
        aria-hidden="true"
      />

      {/* Tap to close hint for manual dismiss */}
      {manualDismiss && !showThumbnail && (
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs transition-opacity duration-300 delay-500 motion-reduce:transition-none ${
            isVisible && !isExiting ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          Tap anywhere to close
        </div>
      )}
    </div>
  );
}

/**
 * Format time in seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
