import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil } from "lucide-react";
import { formatCoordinates } from "@/hooks/use-geolocation";

interface EditableCoordinatesProps {
  latitude: number;
  longitude: number;
  onSave: (lat: number, lng: number) => Promise<void>;
  isAdmin: boolean;
}

export function EditableCoordinates({
  latitude,
  longitude,
  onSave,
  isAdmin,
}: EditableCoordinatesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(`${latitude}, ${longitude}`);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update value when props change
  useEffect(() => {
    if (!isEditing) {
      setValue(`${latitude}, ${longitude}`);
    }
  }, [latitude, longitude, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const parseCoordinates = (
    input: string
  ): { lat: number; lng: number } | null => {
    // Remove any extra whitespace
    const cleaned = input.trim();

    // Try to parse "lat, lng" format
    const parts = cleaned.split(/[,\s]+/).filter(Boolean);
    if (parts.length !== 2) return null;

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    // Validate ranges
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90) return null;
    if (lng < -180 || lng > 180) return null;

    return { lat, lng };
  };

  const handleSave = async () => {
    const coords = parseCoordinates(value);
    if (!coords) {
      setError("Invalid format. Use: lat, lng (e.g., 34.6266, -84.1934)");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(coords.lat, coords.lng);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(`${latitude}, ${longitude}`);
    setError(null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        className={`group flex items-center gap-2 ${isAdmin ? "cursor-pointer" : ""}`}
        onClick={() => isAdmin && setIsEditing(true)}
        title={isAdmin ? "Click to edit coordinates" : undefined}
      >
        <p className="font-mono text-sm">
          {formatCoordinates(latitude, longitude)}
        </p>
        {isAdmin && (
          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="lat, lng"
          className="font-mono text-sm h-8 w-48"
          disabled={saving}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleSave}
          disabled={saving}
        >
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleCancel}
          disabled={saving}
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Format: latitude, longitude (e.g., 34.6266, -84.1934)
      </p>
    </div>
  );
}
