import type { Souffle, UserLocation } from '@/types/souffle';
import { SUSPICIOUS_WORDS } from './moderation';

// Messages aléatoires en ANGLAIS pour la simulation
const randomMessages = [
  "The wind whispers a story only this bench seems to know.",
  "I left a smile here, I hope someone finds it.",
  "Just a moment of peace in the city's hustle and bustle.",
  "If these walls could talk, what would they say about us?",
  "Today, the sky is the color of melancholy.",
  "A hot coffee, a book, and this little corner of the world. Happiness.",
  "I closed my eyes and wished this moment would last forever.",
  "I wonder how many people have looked at this same horizon before me.",
  "This evening light is a promise.",
  "Here, even silence has a voice.",
];

const flaggableMessages = [
  `Cette promotion est-elle une arnaque ?`,
  `Je cherche des infos sur la weed légale ici.`,
  `Attention, ce groupe a l'air d'une vraie secte.`,
  `Quelqu'un a un bon plan pour du viagra sans ordonnance ?`,
  "Is this whole thing a scam?",
  "This group feels like a cult.",
  "Looking for info on legal weed.",
  "Don't fall for the viagra offers, it's just spam."
];

const randomEmotions = ['joyeux', 'pensif', 'triste', 'apaise', 'emu', 'silencieux'];
const randomStickers = ['heart', 'leaf', 'feather', 'star', 'flower'];

/**
 * Génère un seul souffle aléatoire près d'une localisation donnée.
 * Peut générer un souffle "suspect" si isFlaggable est vrai.
 */
export function generateRandomSouffle(location: UserLocation, isFlaggable: boolean = false): Souffle {
  const angle = Math.random() * 2 * Math.PI;
  const radius = Math.random() * 500 + 50;
  const latOffset = (radius / 111111) * Math.cos(angle);
  const lonOffset = radius / (111111 * Math.cos(location.latitude * (Math.PI / 180))) * Math.sin(angle);
  
  const now = Date.now();
  const duration = Math.random() > 0.5 ? 48 : 24;

  const message = isFlaggable
    ? flaggableMessages[Math.floor(Math.random() * flaggableMessages.length)]
    : randomMessages[Math.floor(Math.random() * randomMessages.length)];

  return {
    id: `sim_${now}_${Math.random().toString(36).substr(2, 9)}`,
    content: {
      jeMeSens: randomEmotions[Math.floor(Math.random() * randomEmotions.length)],
      messageLibre: message,
      ceQueJaimerais: '',
    },
    latitude: location.latitude + latOffset,
    longitude: location.longitude + lonOffset,
    createdAt: new Date(now),
    expiresAt: new Date(now + duration * 60 * 60 * 1000),
    isRevealed: false,
    sticker: Math.random() > 0.6 ? randomStickers[Math.floor(Math.random() * randomStickers.length)] : undefined,
    isSimulated: true,
    // --- CORRECTION : Ajout de la propriété 'moderation' manquante ---
    moderation: {
      status: isFlaggable ? 'pending' : 'clean',
      votes: [],
    },
  };
}

/**
 * Génère un lot initial de souffles, dont certains sont "suspects".
 */
export function generateInitialSouffleBatch(location: UserLocation, count: number): Souffle[] {
  const batch: Souffle[] = [];
  for (let i = 0; i < count; i++) {
    const isFlaggable = i % 4 === 0;
    batch.push(generateRandomSouffle(location, isFlaggable));
  }
  return batch;
}

/**
 * Génère un nom poétique pour un lieu.
 */
export function generatePoeticalPlaceName(): string {
  const adjectives = [
    'Silent', 'Whispering', 'Ethereal', 'Luminous', 'Mysterious',
    'Gentle', 'Serene', 'Enchanting', 'Peaceful', 'Melancholic'
  ];
  
  const nouns = [
    'Garden', 'Crossroads', 'Sanctuary', 'Haven', 'Clearing',
    'Corner', 'Echo', 'Retreat', 'Cove', 'Nook'
  ];

  return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
}