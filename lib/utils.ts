import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalizeWords(str?: string) {
  if (!str) return '';
  return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

export function getAvatarColor(name?: string) {
  const colors = ['1ED36A', '150089', 'FEF000', '19211C', 'FF5733', '33FF57', '3357FF'];
  if (!name) return colors[0];
  const charCode = name.charCodeAt(0);
  return colors[charCode % colors.length];
}

export function getInitials(name?: string) {
  if (!name) return 'S';
  const names = name.split(' ');
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}
