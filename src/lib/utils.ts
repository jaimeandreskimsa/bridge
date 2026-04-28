import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return formatDate(date);
  if (days > 0) return `hace ${days} ${days === 1 ? "día" : "días"}`;
  if (hours > 0) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  if (minutes > 0) return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  return "ahora";
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function levelLabel(level: string): string {
  const labels: Record<string, string> = {
    BEGINNER: "Principiante",
    INTERMEDIATE: "Intermedio",
    ADVANCED: "Avanzado",
    EXPERT: "Experto",
  };
  return labels[level] ?? level;
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    ALUMNO: "Alumno",
    PROFESOR: "Profesor",
    MODERADOR: "Moderador",
    SUPERADMIN: "Superadmin",
  };
  return labels[role] ?? role;
}

export function suitIcon(suit: string): string {
  const icons: Record<string, string> = {
    S: "♠",
    H: "♥",
    D: "♦",
    C: "♣",
    N: "SA",
  };
  return icons[suit.toUpperCase()] ?? suit;
}

export function suitColor(suit: string): string {
  return ["H", "D"].includes(suit.toUpperCase()) ? "text-red-600" : "text-gray-900";
}
