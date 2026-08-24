/**
 * `cn` — le fusionneur de classes de shadcn/ui.
 *
 * Seul fichier du dépôt nommé en anglais, et c'est imposé : les composants
 * générés par `shadcn add` importent `@/lib/utils` en dur. Le renommer
 * obligerait à corriger chaque composant à chaque ajout.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
