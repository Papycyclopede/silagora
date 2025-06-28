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