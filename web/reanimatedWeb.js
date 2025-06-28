// Web-compatible version of react-native-reanimated
import { Animated } from 'react-native';

// Export the default Animated from react-native for web compatibility
export default Animated;

// Common reanimated exports that fallback to react-native Animated
export const useSharedValue = (initialValue) => {
  const animatedValue = new Animated.Value(initialValue);
  return {
    value: initialValue,
    _value: animatedValue,
  };
};

export const useAnimatedStyle = (styleFunction) => {
  return styleFunction();
};

export const withTiming = (toValue, config) => {
  return toValue;
};

export const withSpring = (toValue, config) => {
  return toValue;
};

export const runOnJS = (fn) => fn;

export const interpolate = (value, inputRange, outputRange) => {
  return outputRange[0];
};

// Gesture handler compatibility
export const Gesture = {
  Pan: () => ({}),
  Tap: () => ({}),
  Pinch: () => ({}),
  Rotation: () => ({}),
};

export const GestureDetector = ({ children }) => children;