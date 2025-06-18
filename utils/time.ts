// utils/time.ts

import { TFunction } from 'i18next';

/**
 * Calcule le temps écoulé depuis une date donnée et le retourne sous forme de chaîne de caractères traduite.
 * @param date La date à partir de laquelle calculer.
 * @param t La fonction de traduction i18next.
 * @returns Une chaîne de caractères représentant le temps écoulé (ex: "il y a 5 min").
 */
export const getTimeAgo = (date: Date, t: TFunction): string => { 
  const diff = Date.now() - new Date(date).getTime(); 
  const minutes = Math.floor(diff / 60000); 

  if (minutes < 1) return t("justNow", "à l'instant");
  if (minutes < 60) return t("minutesAgo", { count: minutes, defaultValue: `il y a ${minutes} min` });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hoursAgo", { count: hours, defaultValue: `il y a ${hours}h` });
  
  const days = Math.floor(hours / 24);
  return t("daysAgo", { count: days, defaultValue: `il y a ${days} jours` });
};