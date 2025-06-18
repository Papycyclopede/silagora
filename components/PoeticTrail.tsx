import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import type { EnhancedEchoPlace } from '@/utils/echoSimulation';

/**
 * Props pour le composant PoeticTrail.
 */
interface PoeticTrailProps {
  fromPlace: EnhancedEchoPlace;
  toPlace: EnhancedEchoPlace;
  duration?: number; // Durée du voyage de la particule en millisecondes
}

/**
 * Interpole les coordonnées géographiques pour l'animation.
 * @param progress - Valeur animée de 0 à 1.
 * @param from - Coordonnées de départ.
 * @param to - Coordonnées d'arrivée.
 * @returns Un objet avec latitude et longitude animées.
 */
const interpolateCoords = (
  progress: Animated.Value,
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) => {
  const latitude = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [from.latitude, to.latitude],
  });
  const longitude = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [from.longitude, to.longitude],
  });
  return { latitude, longitude };
};

/**
 * Affiche une traînée animée ("courant poétique") entre deux lieux sur la carte.
 * La traînée est représentée par une particule lumineuse qui se déplace en boucle.
 */
function PoeticTrail({ fromPlace, toPlace, duration = 8000 }: PoeticTrailProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // L'animation est en boucle pour un effet continu.
    // Un délai aléatoire est ajouté pour que tous les courants ne soient pas synchronisés.
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(Math.random() * duration),
        Animated.timing(progress, {
          toValue: 1,
          duration: duration,
          // 'useNativeDriver: false' est nécessaire car on anime les props de coordonnées
          // qui ne sont pas gérées par le thread UI natif.
          useNativeDriver: false,
        }),
        // Réinitialise la particule à sa position de départ pour la prochaine boucle.
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [duration]); // L'effet ne se relance que si la durée change.

  // Calcule les coordonnées animées de la particule
  const particleCoords = interpolateCoords(progress, fromPlace, toPlace);

  // Fait apparaître et disparaître la particule en douceur au début et à la fin de son trajet
  const particleOpacity = progress.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Marker.Animated
      coordinate={particleCoords}
      anchor={{ x: 0.5, y: 0.5 }} // Centre le visuel sur la coordonnée
    >
      <Animated.View style={[styles.particle, { opacity: particleOpacity }]} />
    </Marker.Animated>
  );
}

const styles = StyleSheet.create({
  particle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#A8C8E1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
});

// On utilise React.memo pour optimiser les performances et éviter les re-rendus inutiles
// si les props du composant (lieux de départ/arrivée) ne changent pas.
export default React.memo(PoeticTrail);