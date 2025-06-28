import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface SimpleAnimatedViewProps {
  children: React.ReactNode;
  style?: any;
  duration?: number;
  delay?: number;
  fadeIn?: boolean;
  slideIn?: 'left' | 'right' | 'up' | 'down';
  scale?: boolean;
}

export function SimpleAnimatedView({
  children,
  style,
  duration = 300,
  delay = 0,
  fadeIn = false,
  slideIn,
  scale = false,
}: SimpleAnimatedViewProps) {
  const fadeAnim = useRef(new Animated.Value(fadeIn ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(slideIn ? getSlideInitialValue(slideIn) : 0)).current;
  const scaleAnim = useRef(new Animated.Value(scale ? 0 : 1)).current;

  useEffect(() => {
    const animations = [];

    if (fadeIn) {
      animations.push(
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        })
      );
    }

    if (slideIn) {
      animations.push(
        Animated.timing(slideAnim, {
          toValue: 0,
          duration,
          delay,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );
    }

    if (scale) {
      animations.push(
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        })
      );
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
  }, [fadeIn, slideIn, scale, duration, delay]);

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [
      { translateX: slideIn === 'left' || slideIn === 'right' ? slideAnim : 0 },
      { translateY: slideIn === 'up' || slideIn === 'down' ? slideAnim : 0 },
      { scale: scaleAnim },
    ],
  };

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

function getSlideInitialValue(direction: 'left' | 'right' | 'up' | 'down'): number {
  switch (direction) {
    case 'left':
      return -100;
    case 'right':
      return 100;
    case 'up':
      return -100;
    case 'down':
      return 100;
    default:
      return 0;
  }
}

// Composant pour les animations de pulsation
export function PulseAnimation({ children, style }: { children: React.ReactNode; style?: any }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[style, { transform: [{ scale: pulseAnim }] }]}>
      {children}
    </Animated.View>
  );
}

// Composant pour les animations de rotation
export function RotateAnimation({ 
  children, 
  style, 
  duration = 2000 
}: { 
  children: React.ReactNode; 
  style?: any; 
  duration?: number;
}) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      })
    );
    rotate.start();

    return () => rotate.stop();
  }, [duration]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[style, { transform: [{ rotate: spin }] }]}>
      {children}
    </Animated.View>
  );
}