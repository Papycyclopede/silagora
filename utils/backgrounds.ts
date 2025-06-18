// utils/backgrounds.ts (version modifiée)

import { ImageSourcePropType } from 'react-native';

export interface SouffleBackground {
  id: string;
  name: string;
  description: string;
  source?: ImageSourcePropType; // La source est optionnelle pour le fond par défaut
  isPremium: boolean;
  shape: 'circle' | 'square';
}

export const AVAILABLE_BACKGROUNDS: SouffleBackground[] = [
  {
    id: 'default',
    name: 'Classique', // Nom par défaut, sera traduit via t('shop.items.default.name') si besoin
    description: 'Le fond par défaut, simple et épuré.', // Description par défaut
    // Aucune source d'image pour le fond par défaut pour éviter les erreurs
    isPremium: false,
    shape: 'circle',
  },
  {
    id: 'background_autumn',
    name: 'Automne Doux', // Sera écrasé par la traduction
    description: 'Une douce lumière sur des feuilles d\'automne.', // Sera écrasé par la traduction
    source: require('@/assets/images/backgrounds/automn.png'),
    isPremium: true,
    shape: 'square',
  },
  {
    id: 'background_sunray',
    name: 'Lueur Solaire', // Sera écrasé par la traduction
    description: 'Un halo de lumière chaude et bienveillante.', // Sera écrasé par la traduction
    source: require('@/assets/images/backgrounds/soleil.png'),
    isPremium: true,
    shape: 'square',
  },
  // --- NOUVEAUX FONDS AJOUTÉS ---
  {
    id: 'background_aquabolt',
    name: 'Aqua Bolt',
    description: 'Une icône bleue et vibrante.',
    source: require('@/assets/images/backgrounds/aquabolt.png'),
    isPremium: true,
    shape: 'square',
  },
  {
    id: 'background_cityscape',
    name: 'Cité Bleutée',
    description: 'Une métropole paisible peinte à l\'aquarelle.',
    source: require('@/assets/images/backgrounds/city.png'),
    isPremium: true,
    shape: 'square',
  },
  {
    id: 'background_clouds',
    name: 'Ciel de Coton',
    description: 'Des nuages doux et rêveurs dans un ciel d\'été.',
    source: require('@/assets/images/backgrounds/cloud.png'),
    isPremium: true,
    shape: 'square',
  },
  {
    id: 'background_contemporary',
    name: 'Art Contemporain',
    description: 'Formes géométriques et couleurs chaudes.',
    source: require('@/assets/images/backgrounds/contemporain.png'),
    isPremium: true,
    shape: 'square',
  },
  {
    id: 'background_neobolt',
    name: 'Néo Bolt',
    description: 'Un circuit imprimé futuriste et énigmatique.',
    source: require('@/assets/images/backgrounds/neobolt.png'),
    isPremium: true,
    shape: 'square',
  },
  {
    id: 'background_streetart',
    name: 'Corbeau Urbain',
    description: 'Une touche de street art pour vos messages.',
    source: require('@/assets/images/backgrounds/streetart.png'),
    isPremium: true,
    shape: 'square',
  },
  // --- FIN DES AJOUTS ---
];

export function getBackgroundById(id?: string): SouffleBackground {
  if (!id) return AVAILABLE_BACKGROUNDS[0]; 
  return AVAILABLE_BACKGROUNDS.find(bg => bg.id === id) || AVAILABLE_BACKGROUNDS[0];
}