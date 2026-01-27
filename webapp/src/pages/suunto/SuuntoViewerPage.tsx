/**
 * Suunto Replay Studio - Viewer Page
 *
 * Displays uploaded or demo activity with style selector.
 * Supports 10 unique visual styles for the Activity Player.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Share2, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { StyleSelector } from "@/components/suunto/StyleSelector";
import { ClassicPlayer } from "@/components/suunto/players/ClassicPlayer";
import { CinematicPlayer } from "@/components/suunto/players/CinematicPlayer";
import { MinimalPlayer } from "@/components/suunto/players/MinimalPlayer";
import { DashboardPlayer } from "@/components/suunto/players/DashboardPlayer";
import { StravaPlayer } from "@/components/suunto/players/StravaPlayer";
import { PolaroidPlayer } from "@/components/suunto/players/PolaroidPlayer";
import { TerminalPlayer } from "@/components/suunto/players/TerminalPlayer";
import { NeonPlayer } from "@/components/suunto/players/NeonPlayer";
import { EditorialPlayer } from "@/components/suunto/players/EditorialPlayer";
import { TopographicPlayer } from "@/components/suunto/players/TopographicPlayer";
import type { SuuntoParseResult } from "@/lib/suunto-parser";

export type PlayerStyle =
  | "classic"
  | "cinematic"
  | "minimal"
  | "dashboard"
  | "strava"
  | "polaroid"
  | "terminal"
  | "neon"
  | "editorial"
  | "topographic";

interface ActivityData {
  shareId?: string;
  filename: string;
  parsedData: SuuntoParseResult;
  isDemo?: boolean;
  viewCount?: number;
}

export function SuuntoViewerPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname === "/suunto/demo";

  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<PlayerStyle>("classic");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadActivity() {
      setIsLoading(true);
      setError(null);

      try {
        if (isDemo) {
          const data = await api.get<ActivityData>("/api/replay-studio/demo");
          setActivityData(data);
        } else if (shareId) {
          const data = await api.get<ActivityData>(`/api/replay-studio/${shareId}`);
          setActivityData(data);
        } else {
          setError("No activity specified");
        }
      } catch (e) {
        console.error("Failed to load activity:", e);
        setError(e instanceof Error ? e.message : "Failed to load activity");
      } finally {
        setIsLoading(false);
      }
    }

    loadActivity();
  }, [shareId, isDemo]);

  const handleShare = async () => {
    if (!activityData?.shareId) return;

    const url = `${window.location.origin}/suunto/view/${activityData.shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderPlayer = () => {
    if (!activityData) return null;

    switch (selectedStyle) {
      case "classic":
        return <ClassicPlayer data={activityData.parsedData} />;
      case "cinematic":
        return <CinematicPlayer data={activityData.parsedData} />;
      case "minimal":
        return <MinimalPlayer data={activityData.parsedData} />;
      case "dashboard":
        return <DashboardPlayer data={activityData.parsedData} />;
      case "strava":
        return <StravaPlayer data={activityData.parsedData} />;
      case "polaroid":
        return <PolaroidPlayer data={activityData.parsedData} />;
      case "terminal":
        return <TerminalPlayer data={activityData.parsedData} />;
      case "neon":
        return <NeonPlayer data={activityData.parsedData} />;
      case "editorial":
        return <EditorialPlayer data={activityData.parsedData} />;
      case "topographic":
        return <TopographicPlayer data={activityData.parsedData} />;
      default:
        return <ClassicPlayer data={activityData.parsedData} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white/60">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="bg-white/5 border-white/10 p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-white/60 mb-4">{error}</p>
          <Button onClick={() => navigate("/suunto")} variant="outline" className="border-white/20 text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Upload
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/suunto")}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="hidden sm:block">
                <h1 className="text-sm font-medium text-white">
                  {activityData?.filename || "Activity"}
                </h1>
                {activityData?.isDemo && (
                  <span className="text-xs text-amber-400">Demo Mode</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Style Selector */}
              <StyleSelector selected={selectedStyle} onSelect={setSelectedStyle} />

              {/* Share Button */}
              {activityData?.shareId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Player */}
      <main className="container mx-auto px-4 py-6">
        {renderPlayer()}
      </main>
    </div>
  );
}
