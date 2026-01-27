/**
 * Activity Replay Studio - Landing Page
 *
 * Main entry point for the Replay Studio sub-application.
 * Provides drag-and-drop upload and demo access.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Play, Sparkles, Zap, BarChart3, Film } from "lucide-react";
import { api } from "@/lib/api";

export function SuuntoLandingPage() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Please upload a Suunto JSON file");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.upload<{ shareId: string; viewUrl: string }>(
        "/api/replay-studio/upload",
        formData
      );

      navigate(`/suunto/view/${response.shareId}`);
    } catch (e) {
      console.error("Upload failed:", e);
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/json": [".json"] },
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleDemo = () => {
    navigate("/suunto/demo");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-coral-500 to-amber-500">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">BigFun's Activity Replay Studio</h1>
              <p className="text-sm text-white/60">Transform your Suunto data into cinematic replays</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Relive Your Adventures
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Upload your Suunto fitness watch data and experience your activities
              with stunning animated playback in 4 unique visual styles.
            </p>
          </div>

          {/* Upload Card */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-white">Upload Your Activity</CardTitle>
              <CardDescription className="text-white/60">
                Drag and drop your Suunto JSON export file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`
                  relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                  transition-all duration-200
                  ${isDragActive
                    ? "border-coral-500 bg-coral-500/10"
                    : "border-white/20 hover:border-white/40 hover:bg-white/5"
                  }
                  ${isUploading ? "opacity-50 cursor-wait" : ""}
                `}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="inline-flex p-4 rounded-full bg-white/10">
                    <Upload className={`h-8 w-8 ${isDragActive ? "text-coral-400" : "text-white/60"}`} />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">
                      {isDragActive ? "Drop your file here" : "Drag & drop your Suunto JSON file"}
                    </p>
                    <p className="text-sm text-white/50 mt-1">
                      or click to browse
                    </p>
                  </div>
                </div>
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral-500" />
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-4 text-center text-red-400 text-sm">{error}</p>
              )}

              {/* Demo Button */}
              <div className="mt-6 text-center">
                <p className="text-white/50 text-sm mb-3">Don't have a file? Try our demo</p>
                <Button
                  variant="outline"
                  onClick={handleDemo}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Play className="mr-2 h-4 w-4" />
                  View Demo Activity
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Style Preview Cards */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white text-center">4 Stunning Visual Styles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StyleCard
                title="Classic"
                description="Clean and familiar, with a fresh new color palette"
                icon={<Sparkles className="h-5 w-5" />}
                gradient="from-blue-600 to-cyan-500"
              />
              <StyleCard
                title="Cinematic"
                description="Full-screen immersive experience with dramatic camera"
                icon={<Film className="h-5 w-5" />}
                gradient="from-amber-500 to-orange-600"
              />
              <StyleCard
                title="Minimal"
                description="Typography-focused, clean Scandinavian design"
                icon={<BarChart3 className="h-5 w-5" />}
                gradient="from-slate-400 to-slate-600"
              />
              <StyleCard
                title="Dashboard"
                description="Professional analytics with multiple data views"
                icon={<Zap className="h-5 w-5" />}
                gradient="from-cyan-500 to-purple-600"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-white/40 text-sm">
          Part of the BigFun Hikes! project
        </div>
      </footer>
    </div>
  );
}

function StyleCard({
  title,
  description,
  icon,
  gradient
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-all">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
      <div className="relative flex items-start gap-4">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient}`}>
          {icon}
        </div>
        <div>
          <h4 className="font-semibold text-white">{title}</h4>
          <p className="text-sm text-white/60 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
