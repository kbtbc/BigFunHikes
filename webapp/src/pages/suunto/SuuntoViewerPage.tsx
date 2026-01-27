/**
 * Activity Replay Studio - Viewer Page
 *
 * Displays uploaded or demo activity with style selector.
 * Supports 4 unique visual styles for the Activity Player.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Share2, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { StyleSelector } from "@/components/suunto/StyleSelector";
import { ClassicPlayer } from "@/components/suunto/players/ClassicPlayer";
import type { SuuntoParseResult } from "@/lib/suunto-parser";

export type PlayerStyle = "classic" | "cinematic" | "minimal" | "dashboard";

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

    // For now, all styles use ClassicPlayer - we'll implement others later
    switch (selectedStyle) {
      case "classic":
        return <ClassicPlayer data={activityData.parsedData} />;
      case "cinematic":
        return <ClassicPlayer data={activityData.parsedData} />; // TODO: CinematicPlayer
      case "minimal":
        return <ClassicPlayer data={activityData.parsedData} />; // TODO: MinimalPlayer
      case "dashboard":
        return <ClassicPlayer data={activityData.parsedData} />; // TODO: DashboardPlayer
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
