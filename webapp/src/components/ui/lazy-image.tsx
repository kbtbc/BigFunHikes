import { useState, useCallback } from "react";
import { ImageOff } from "lucide-react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function LazyImage({
  src,
  alt,
  className = "",
  fallbackClassName = "",
}: LazyImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${fallbackClassName || className}`}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageOff className="h-8 w-8" />
          <span className="text-xs">Image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isLoaded && (
        <div
          className={`animate-pulse bg-muted ${className}`}
          aria-hidden="true"
        />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={handleError}
        onLoad={handleLoad}
        className={`${className} ${!isLoaded ? "hidden" : ""}`}
      />
    </>
  );
}
