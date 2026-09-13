"use client";
import { useState, type ComponentProps } from "react";

export function SafeImage({ src, alt, ...props }: ComponentProps<"img">) {
  const [failedSource, setFailedSource] = useState<typeof src>();
  const failed = !src || failedSource === src;
  return (
    <img
      {...props}
      ref={(element) => {
        // A cached failure can finish before React attaches the error handler.
        if (element?.complete && element.naturalWidth === 0 && !failed) {
          setFailedSource(src);
        }
      }}
      src={failed ? "/images/camera-placeholder.webp" : src}
      alt={failed && alt ? `${alt} — ảnh minh họa` : alt}
      onError={() => {
        if (!failed) setFailedSource(src);
      }}
    />
  );
}
