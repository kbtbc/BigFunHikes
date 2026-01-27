/**
 * Style Selector - Choose between 4 Activity Player visual styles
 */

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Sparkles, Film, BarChart3, Zap } from "lucide-react";
import type { PlayerStyle } from "@/pages/suunto/SuuntoViewerPage";

interface StyleSelectorProps {
  selected: PlayerStyle;
  onSelect: (style: PlayerStyle) => void;
}

const styles: { id: PlayerStyle; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: "classic",
    label: "Classic",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Clean and familiar",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    icon: <Film className="h-4 w-4" />,
    description: "Full-screen immersive",
  },
  {
    id: "minimal",
    label: "Minimal",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Typography-focused",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <Zap className="h-4 w-4" />,
    description: "Data-rich analytics",
  },
];

export function StyleSelector({ selected, onSelect }: StyleSelectorProps) {
  const currentStyle = styles.find((s) => s.id === selected) || styles[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-white/20 text-white hover:bg-white/10 gap-2"
        >
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">{currentStyle.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {styles.map((style) => (
          <DropdownMenuItem
            key={style.id}
            onClick={() => onSelect(style.id)}
            className={`flex items-center gap-3 cursor-pointer ${
              selected === style.id ? "bg-accent" : ""
            }`}
          >
            {style.icon}
            <div>
              <div className="font-medium">{style.label}</div>
              <div className="text-xs text-muted-foreground">{style.description}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
