// utils/moderation.ts (Version optimisée et modulaire)
import type { SouffleContent } from '@/types/souffle';

// --- CONFIGURATION DE LA MODÉRATION ---
const THRESHOLD_BLOCK = 10;
const THRESHOLD_SANITIZE = 4;

const WEIGHTS = {
  FORBIDDEN_WORD: 5,
  SUSPICIOUS_WORD: 2,
  PERSONAL_INFO: 15,
  EXCESSIVE_CAPS: 1,
  REPETITION: 3,
  URL: 15,
};

// --- DICTIONNAIRES DE MOTS DE BASE ---
// CORRECTION : On ajoute le mot-clé 'export' pour rendre cette liste accessible aux autres fichiers
export const FORBIDDEN_WORDS = [
  'connard', 'salope', 'putain', 'merde', 'con', 'conne', 'encule', 'fdp',
  'bitch', 'fuck', 'shit', 'cunt', 'asshole', 'motherfucker', 'nword', 'nigger',
  'nazi', 'hitler', 'terroriste', 'terrorist', 'raciste', 'racist', 'daesh', 'isis',
  'drogue', 'drug', 'suicide', 'murder', 'meurtre',
  'bitcoin', 'crypto', 'investissement', 'investment', 'argent facile', 'easy money', 'promo', 'free', 'gratuit',
];

export const SUSPICIOUS_WORDS = [
  'sexe', 'sex', 'porn', 'weed', 'arnaque', 'scam', 'secte', 'cult', 'viagra'
];

// --- LOGIQUE DE NORMALISATION (INCHANGÉE) ---
function superNormalize(text: string): string {
  let normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  normalized = normalized
    .replace(/[4@]/g, 'a')
    .replace(/[3€]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$s]/g, 's')
    .replace(/[7]/g, 't');
  normalized = normalized.replace(/[^a-z0-9]/gi, '');
  return normalized;
}

// --- STRUCTURE DE RÈGLES MODULAIRE ---
interface ModerationRule {
  key: string;
  weight: number;
  check: (originalText: string, normalizedText: string) => boolean | string[];
  getReason: (match?: boolean | string[]) => string;
}

// --- DÉBUT DE LA CORRECTION ---
// La seule modification est dans la fonction `getReason` de chaque règle.
// Elle retourne maintenant une clé simple et non une phrase.

const moderationRules: ModerationRule[] = [
  {
    key: 'url',
    weight: WEIGHTS.URL,
    check: (originalText) => /(https?:\/\/[^\s]+)/g.test(originalText),
    getReason: () => 'url_sharing',
  },
  {
    key: 'pii',
    weight: WEIGHTS.PERSONAL_INFO,
    check: (originalText) => (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i).test(originalText) || /(?:(?:\+|00)33[\s.-]{0,3}(?:\(0\)[\s.-]{0,3})?|0)[1-9](?:(?:[\s.-]?\d{2}){4}|\d{2}(?:[\s.-]?\d{3}){2})/.test(originalText),
    getReason: () => 'personal_info_sharing',
  },
  {
    key: 'forbidden_words',
    weight: WEIGHTS.FORBIDDEN_WORD,
    check: (originalText, normalizedText) => {
      const foundWords = FORBIDDEN_WORDS.filter(word => normalizedText.includes(superNormalize(word)));
      return foundWords.length > 0 ? foundWords : false;
    },
    // CORRIGÉ : La fonction ne retourne plus une phrase dynamique
    getReason: () => 'inappropriate_content',
  },
  {
    key: 'suspicious_words',
    weight: WEIGHTS.SUSPICIOUS_WORD,
    check: (originalText, normalizedText) => {
      const foundWords = SUSPICIOUS_WORDS.filter(word => normalizedText.includes(superNormalize(word)));
      return foundWords.length > 0 ? foundWords : false;
    },
    // CORRIGÉ : La fonction ne retourne plus une phrase dynamique
    getReason: () => 'suspicious_content',
  },
  {
    key: 'excessive_caps',
    weight: WEIGHTS.EXCESSIVE_CAPS,
    check: (originalText) => {
      const capsRatio = (originalText.match(/[A-Z]/g)?.length || 0) / originalText.length;
      return capsRatio > 0.5 && originalText.length > 20;
    },
    getReason: () => 'excessive_caps',
  },
  {
    key: 'repetition',
    weight: WEIGHTS.REPETITION,
    check: (originalText) => /(.)\1{3,}/.test(originalText),
    getReason: () => 'excessive_repetition',
  },
];

// --- FIN DE LA CORRECTION ---


// --- FONCTION DE VALIDATION PRINCIPALE (REFACTORISÉE) ---
interface ModerationResult {
  status: 'clean' | 'flagged' | 'blocked';
  reasons: string[];
  sanitizedContent?: string;
}

export function validateSouffleContent(content: SouffleContent): ModerationResult {
  let score = 0;
  const reasons: string[] = [];
  const wordsToSanitize: string[] = [];

  const originalText = `${content.jeMeSens} ${content.messageLibre} ${content.ceQueJaimerais}`;
  const normalizedText = superNormalize(originalText);

  moderationRules.forEach(rule => {
    const match = rule.check(originalText, normalizedText);
    if (match) {
      score += rule.weight;
      reasons.push(rule.getReason(match));
      if (Array.isArray(match)) {
        wordsToSanitize.push(...match);
      }
    }
  });

  if (score >= THRESHOLD_BLOCK) {
    return { status: 'blocked', reasons: Array.from(new Set(reasons)) };
  }

  if (score >= THRESHOLD_SANITIZE) {
    const sanitizationRegex = new RegExp(wordsToSanitize.map(word =>
      word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    ).join('|'), 'gi');
    
    const sanitizedMessage = content.messageLibre.replace(sanitizationRegex, '***');
    const sanitizedContent = JSON.stringify({ ...content, messageLibre: sanitizedMessage });

    return { status: 'flagged', reasons: Array.from(new Set(reasons)), sanitizedContent };
  }

  return { status: 'clean', reasons: [] };
}