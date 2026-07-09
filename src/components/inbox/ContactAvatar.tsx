import { useState } from "react";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

export function ContactAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const [errored, setErrored] = useState(false);
  if (src && !errored) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setErrored(true)}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
