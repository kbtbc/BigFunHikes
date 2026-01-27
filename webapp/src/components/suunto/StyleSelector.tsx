/**
 * Style Selector - Choose between 10 Activity Player visual styles
 */

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Palette,
  Sparkles,
  Film,
  BarChart3,
  Zap,
  Terminal,
  Newspaper,
  Map,
  Plane,
  Ruler,
  BookOpen,
  Contrast,
  Compass,
  Shield,
  Trophy,
  Radio,
} from "lucide-react";
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
  {
    id: "terminal",
    label: "Terminal",
    icon: <Terminal className="h-4 w-4" />,
    description: "Hacker CLI style",
  },
  {
    id: "editorial",
    label: "Editorial",
    icon: <Newspaper className="h-4 w-4" />,
    description: "Magazine layout",
  },
  {
    id: "topographic",
    label: "Topographic",
    icon: <Map className="h-4 w-4" />,
    description: "Cartography focused",
  },
  {
    id: "cockpit",
    label: "Cockpit",
    icon: <Plane className="h-4 w-4" />,
    description: "Aviation HUD style",
  },
  {
    id: "blueprint",
    label: "Blueprint",
    icon: <Ruler className="h-4 w-4" />,
    description: "Technical drawing",
  },
  {
    id: "fieldjournal",
    label: "Field Journal",
    icon: <BookOpen className="h-4 w-4" />,
    description: "Naturalist notebook",
  },
  {
    id: "noir",
    label: "Noir",
    icon: <Contrast className="h-4 w-4" />,
    description: "Film noir cinematic",
  },
  {
    id: "expedition",
    label: "Expedition",
    icon: <Compass className="h-4 w-4" />,
    description: "National Geographic style",
  },
  {
    id: "command",
    label: "Command",
    icon: <Shield className="h-4 w-4" />,
    description: "Military tactical ops",
  },
  {
    id: "athletic",
    label: "Athletic",
    icon: <Trophy className="h-4 w-4" />,
    description: "ESPN sports broadcast",
  },
  {
    id: "retro",
    label: "Retro",
    icon: <Radio className="h-4 w-4" />,
    description: "70s analog gauges",
  },
];

export function StyleSelector({ selected, onSelect }: StyleSelectorProps) {
  const currentStyle = styles.find((s) => s.id === selected) || styles[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 hover:from-orange-600 hover:to-amber-600 shadow-lg gap-2 font-semibold"
        >
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">{currentStyle.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Choose Style</DropdownMenuLabel>
        <DropdownMenuSeparator />
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
