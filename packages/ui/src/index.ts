export function cn(...inputs: any[]): string {
  return inputs.filter(Boolean).join(" ");
}

export const tokens = {
  bg: {
    primary: "bg-white dark:bg-zinc-950",
    secondary: "bg-zinc-50 dark:bg-zinc-900",
    tertiary: "bg-zinc-100 dark:bg-zinc-800",
    card: "bg-white dark:bg-zinc-900",
    border: "border-zinc-200 dark:border-zinc-800",
    muted: "text-zinc-400 dark:text-zinc-500",
    subtle: "text-zinc-500 dark:text-zinc-400",
  },
  text: {
    primary: "text-zinc-900 dark:text-zinc-100",
    secondary: "text-zinc-600 dark:text-zinc-400",
    muted: "text-zinc-400 dark:text-zinc-500",
  },
  accent: {
    DEFAULT: "text-zinc-600 dark:text-zinc-300",
    hover: "text-zinc-900 dark:text-zinc-100",
    subtle: "bg-zinc-100 dark:bg-zinc-800",
  },
};

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  if (diff < 604_800_000) return Math.floor(diff / 86_400_000) + "d ago";
  return formatDate(date);
}

export function truncate(str: string, len: number): string {
  return str.length <= len ? str : str.slice(0, len) + "…";
}