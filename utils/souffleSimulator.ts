// utils/souffleSimulator.ts
import { v4 as uuidv4 } from 'uuid';
import type { Souffle, SouffleContent, UserLocation } from '@/types/souffle';
import { AVAILABLE_BACKGROUNDS } from './backgrounds';
import { FORBIDDEN_WORDS } from './moderation';

const MIN_SIMULATION_DISTANCE = 50; // en mètres
const MAX_SIMULATION_DISTANCE = 800; // en mètres

// --- DÉBUT DE LA CORRECTION ---
// Remplacement des clés d'émotion pour qu'elles correspondent au fichier de langue
const SAMPLE_EMOTIONS = ['joyeux', 'triste', 'colere', 'anxieux', 'aimant', 'pensif', 'apaise', 'emu'];
// --- FIN DE LA CORRECTION ---

const SAMPLE_MESSAGES = [
  "Les nuages dessinent des histoires éphémères dans le ciel.",
  "Le silence a parfois plus de choses à dire que les mots.",
  "Quelqu'un s'est déjà assis sur ce banc en pensant à l'avenir ?",
  "J'ai caché un sourire dans ce message, j'espère que vous le trouverez.",
  "Le bruit des feuilles mortes sous les pieds, c'est la musique de l'automne.",
  "Si seulement les murs pouvaient parler, que raconteraient-ils de cet endroit ?",
  "Aujourd'hui, je choisis de voir la poésie dans les petites choses.",
  "Un café chaud, un bon livre, et le monde peut attendre.",
  "Juste un petit mot pour briser le silence numérique.",
  "Respirez profondément. Ce moment est unique."
];

const SAMPLE_FORBIDDEN_MESSAGES = [
  `Ce message contient le mot ${FORBIDDEN_WORDS[0]}, il devrait être modéré.`,
  `Attention, ceci est un test de modération. Le mot ${FORBIDDEN_WORDS[1]} est présent.`,
  `Je suis ${FORBIDDEN_WORDS[2]} de voir que personne n'a laissé de message ici avant moi !`
];

const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateRandomSouffle = (center: UserLocation): Souffle => {
  const isPremiumAttempt = Math.random() < 0.4;
  const isForbiddenAttempt = Math.random() < 0.3;
  let message = getRandomElement(SAMPLE_MESSAGES);
  let moderationStatus: 'clean' | 'pending' = 'clean';

  if (isForbiddenAttempt) {
    message = getRandomElement(SAMPLE_FORBIDDEN_MESSAGES);
    moderationStatus = 'pending';
    console.log("SIMULATEUR: Génération d'un souffle à modérer.");
  }

  const content: SouffleContent = {
    jeMeSens: getRandomElement(SAMPLE_EMOTIONS),
    messageLibre: message,
    ceQueJaimerais: 'partager un instant.',
  };

  let backgroundId = undefined;
  if (isPremiumAttempt) {
    const premiumBackgrounds = AVAILABLE_BACKGROUNDS.filter(bg => bg.isPremium);
    if (premiumBackgrounds.length > 0) {
      backgroundId = getRandomElement(premiumBackgrounds).id;
      console.log(`SIMULATEUR: Attribution du fond premium: ${backgroundId}`);
    }
  }

  const randomAngle = Math.random() * 2 * Math.PI;
  const randomDistance = MIN_SIMULATION_DISTANCE + Math.random() * (MAX_SIMULATION_DISTANCE - MIN_SIMULATION_DISTANCE);
  const latOffset = (randomDistance / 111111) * Math.cos(randomAngle);
  const lonOffset = (randomDistance / (111111 * Math.cos(center.latitude * Math.PI / 180))) * Math.sin(randomAngle);

  return {
    id: uuidv4(),
    content: content,
    latitude: center.latitude + latOffset,
    longitude: center.longitude + lonOffset,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    isRevealed: false,
    backgroundId: backgroundId,
    isSimulated: true,
    moderation: {
      status: moderationStatus,
      votes: [],
    },
  };
};

export const generateInitialSouffleBatch = (center: UserLocation, count: number): Souffle[] => {
  const batch: Souffle[] = [];
  for (let i = 0; i < count; i++) {
    batch.push(generateRandomSouffle(center));
  }
  return batch;
};