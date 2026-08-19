import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    prepared: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    on_route: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    received: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    on_route: "On Route",
  };
  return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
}
