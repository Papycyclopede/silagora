// utils/echoSimulation.ts

import type { EchoPlace, Souffle } from '@/types/souffle';
import { calculateDistance } from '@/utils/distance';

export interface EchoTrail {
  id: string;
  fromPlaceId: string;
  toPlaceId: string;
}

export interface EnhancedEchoPlace extends EchoPlace {
  intensity: 'murmure' | 'echo' | 'sanctuaire';
  colorTheme: string;
  poeticEmote: string;
}

const SIMPLE_PLACE_NAMES = [
  'Jardin des Murmures', 'Carrefour Silencieux', 'Alcôve Secrète', 'Refuge Tranquille',
  'Bosquet Paisible', 'Clairière Douce', 'Coin Contemplatif', 'Havre de Paix'
];
const PLACE_COLORS = [ '#A8C8E1', '#B8E6B8', '#F4E4BC', '#D4A574', '#E6A8A8' ];
const SIMULATION_RADIUS = 500; // Rayon de recherche des souffles autour de l'utilisateur
const CLUSTER_RADIUS = 150; // Rayon pour former un cluster de souffles

const POETIC_EMOTES_MAP: Record<EnhancedEchoPlace['intensity'], string[]> = {
  'murmure': ['🌳', '🏡', '🗺️', '📍'],
  'echo': ['🏛️', '🏞️', '🌉', '🌌'],
  'sanctuaire': ['🏰', '🌌'],
};

/**
 * Simule la création de "lieux d'écho" (places) et de "courants poétiques" (trails)
 * basés sur la densité des souffles à proximité de l'utilisateur.
 * Cet algorithme de clustering est optimisé pour éviter les performances dégradées
 * lors de l'activation de la simulation.
 *
 * @param souffles La liste de tous les souffles actifs.
 * @param userLatitude La latitude actuelle de l'utilisateur.
 * @param userLongitude La longitude actuelle de l'utilisateur.
 * @returns Un objet contenant les lieux d'écho améliorés et les sentiers entre eux (les sentiers sont actuellement désactivés dans la carte pour des raisons de performance).
 */
export function generateEchoes(
  souffles: Souffle[],
  userLatitude: number,
  userLongitude: number
): { places: EnhancedEchoPlace[]; trails: EchoTrail[] } {
  // 1. Filtrer les souffles à proximité de l'utilisateur
  const nearbySouffles = souffles.filter(s =>
    calculateDistance(userLatitude, userLongitude, s.latitude, s.longitude) <= SIMULATION_RADIUS
  );

  const clusters: Souffle[][] = [];
  const assignedToCluster = new Set<string>(); // Pour garder une trace des souffles déjà assignés à un cluster

  // 2. Regrouper les souffles à proximité en clusters (approche BFS-like)
  for (const currentSouffle of nearbySouffles) {
    // Si le souffle a déjà été assigné à un cluster, on le saute
    if (assignedToCluster.has(currentSouffle.id)) {
      continue;
    }

    const newCluster: Souffle[] = [];
    const queue: Souffle[] = [currentSouffle]; // Queue pour la recherche en largeur
    assignedToCluster.add(currentSouffle.id); // Marque le souffle actuel comme assigné

    let head = 0;
    while (head < queue.length) {
      const referenceSouffle = queue[head++]; // Prend le souffle de référence de la queue

      newCluster.push(referenceSouffle); // Ajoute le souffle de référence au nouveau cluster

      // Parcourt tous les souffles à proximité pour trouver ceux qui sont proches du souffle de référence
      for (const candidateSouffle of nearbySouffles) {
        if (!assignedToCluster.has(candidateSouffle.id) &&
            calculateDistance(referenceSouffle.latitude, referenceSouffle.longitude, candidateSouffle.latitude, candidateSouffle.longitude) <= CLUSTER_RADIUS) {
          
          assignedToCluster.add(candidateSouffle.id); // Marque le candidat comme assigné
          queue.push(candidateSouffle); // Ajoute le candidat à la queue pour explorer ses voisins
        }
      }
    }
    
    // Ajoute le cluster formé si il contient au moins un souffle
    if (newCluster.length > 0) {
        clusters.push(newCluster);
    }
  }

  // 3. Création des lieux d'écho à partir des clusters formés
  const echoPlaces: EchoPlace[] = clusters.map((cluster, index) => {
    // Calculer le centre moyen du cluster
    let avgLat = 0;
    let avgLon = 0;
    for (const s of cluster) {
      avgLat += s.latitude;
      avgLon += s.longitude;
    }
    avgLat /= cluster.length;
    avgLon /= cluster.length;

    return {
      id: `echo_${index}_${Date.now()}`, // Identifiant unique pour le lieu d'écho
      name: SIMPLE_PLACE_NAMES[Math.floor(Math.random() * SIMPLE_PLACE_NAMES.length)],
      latitude: avgLat,
      longitude: avgLon,
      souffleCount: cluster.length,
    };
  }).filter(place => place.souffleCount >= 2); // Un lieu d'écho doit avoir au moins 2 souffles

  // 4. Amélioration des lieux d'écho avec intensité et émoticônes
  const enhancedPlaces: EnhancedEchoPlace[] = echoPlaces.map((place, index) => {
    // Déterminer l'intensité du lieu d'écho en fonction du nombre de souffles
    const intensity: EnhancedEchoPlace['intensity'] =
      place.souffleCount >= 10 ? 'sanctuaire' : place.souffleCount >= 5 ? 'echo' : 'murmure';

    // Sélectionner une émoticône poétique basée sur l'intensité
    const availableEmotes = POETIC_EMOTES_MAP[intensity];
    const selectedEmote = availableEmotes[Math.floor(Math.random() * availableEmotes.length)];

    return {
      ...place,
      intensity: intensity,
      colorTheme: PLACE_COLORS[index % PLACE_COLORS.length], // Attribue une couleur cycliquement
      poeticEmote: selectedEmote,
    };
  });

  // 5. Création des sentiers (trails) entre les lieux d'écho proches (actuellement non rendus sur la carte)
  const trails: EchoTrail[] = [];
  if (enhancedPlaces.length > 1) {
    for (let i = 0; i < enhancedPlaces.length; i++) {
      for (let j = i + 1; j < enhancedPlaces.length; j++) {
        // Crée un trail si les lieux d'écho sont suffisamment proches
        if (calculateDistance(enhancedPlaces[i].latitude, enhancedPlaces[i].longitude, enhancedPlaces[j].latitude, enhancedPlaces[j].longitude) < SIMULATION_RADIUS / 2) {
            trails.push({
                id: `trail_${enhancedPlaces[i].id}_${enhancedPlaces[j].id}`,
                fromPlaceId: enhancedPlaces[i].id,
                toPlaceId: enhancedPlaces[j].id,
            });
        }
      }
    }
  }

  return { places: enhancedPlaces, trails };
}
