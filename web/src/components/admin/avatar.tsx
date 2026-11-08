import { cn } from "@/lib/utils";

const palette = [
  "bg-info-soft text-primary",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
  "bg-danger-soft text-destructive",
  "bg-muted text-muted-foreground",
];

export function InitialsAvatar({
  name,
  seed = 0,
  size = "sm",
  square,
}: {
  name: string;
  seed?: number;
  size?: "sm" | "lg";
  square?: boolean;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold",
        square ? "rounded" : "rounded-full",
        size === "sm" ? "size-8 text-xs" : "size-20 text-2xl",
        palette[seed % palette.length],
      )}
    >
      {initials}
    </span>
  );
}
