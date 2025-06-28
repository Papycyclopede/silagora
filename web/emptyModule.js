// Empty module to replace native-only modules on web
export default {};

// Export common components that might be imported
export const MapView = () => null;
export const Marker = () => null;
export const Circle = () => null;
export const Polyline = () => null;
export const Polygon = () => null;
export const Callout = () => null;
export const UrlTile = () => null;
export const LocalTile = () => null;
export const Overlay = () => null;
export const Heatmap = () => null;
export const Geojson = () => null;

// Export any other commonly used exports
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

// Common native module exports
export const impactAsync = () => Promise.resolve();
export const notificationAsync = () => Promise.resolve();
export const selectionAsync = () => Promise.resolve();

// Expo modules common exports
export const authenticateAsync = () => Promise.resolve({ success: false });
export const hasHardwareAsync = () => Promise.resolve(false);
export const isEnrolledAsync = () => Promise.resolve(false);

// Sensor exports
export const Accelerometer = {
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => {},
  setUpdateInterval: () => {},
};

export const Gyroscope = {
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => {},
  setUpdateInterval: () => {},
};

export const Magnetometer = {
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => {},
  setUpdateInterval: () => {},
};