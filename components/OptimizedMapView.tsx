import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ImageBackground,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Circle } from 'react-native-maps';
import type MapViewType from 'react-native-maps';
import type { Region } from 'react-native-maps';
import type { Souffle, SuspendedTicket } from '@/types/souffle';
import { useLocation } from '@/contexts/LocationContext';
import { useSouffle } from '@/contexts/SouffleContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { isWithinRevealDistance } from '@/utils/distance';
import { getStickerById } from '@/utils/stickers';
import { getBackgroundById } from '@/utils/backgrounds';
import { AnimatedHalo, WaveEffect, FloatingParticle } from './MapAnimations';
import { Eye, Gift } from 'lucide-react-native';
import { generateEchoes } from '@/utils/echoSimulation';

const REVEALED_COLORS = [
  'rgba(168, 200, 225, 0.9)', // Bleu pastel
  'rgba(184, 230, 184, 0.9)', // Vert pastel
  'rgba(244, 228, 188, 0.9)', // Sable pastel
  'rgba(212, 165, 116, 0.9)', // Ocre pastel
  'rgba(252, 237, 230, 0.9)', // Pêche pastel
];

const unrevealedColors = [
  'rgba(170, 200, 230, 0.85)',
  'rgba(170, 230, 200, 0.85)',
  'rgba(250, 220, 180, 0.85)',
  'rgba(230, 190, 210, 0.85)',
];

interface OptimizedMapViewProps {
  mode: 'read' | 'write';
  isEchoSimulationActive: boolean;
  onMarkerPress: (souffle: Souffle) => Promise<void>;
  onTicketPress: (ticket: SuspendedTicket) => Promise<void>;
}

export interface MapViewActions {
  locateMe: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleMapType: () => void;
}

const MAP_TYPE_STORAGE_KEY = '@silagora:map_type';
const MIN_ZOOM = 8;
const MAX_ZOOM = 20;
const DEFAULT_ZOOM = 16;
const calculateDelta = (zoom: number) => Math.max(0.001, 360 / Math.pow(2, zoom));

const SouffleMarker = React.memo(({ souffle, userLocation, onPress, index }: { souffle: Souffle; userLocation: any; onPress: (souffle: Souffle) => void; index: number }) => {
  const canReveal = useMemo(() => isWithinRevealDistance(userLocation.latitude, userLocation.longitude, souffle.latitude, souffle.longitude), [userLocation, souffle]);
  const sticker = useMemo(() => souffle.sticker ? getStickerById(souffle.sticker) : null, [souffle.sticker]);
  const background = useMemo(() => getBackgroundById(souffle.backgroundId), [souffle.backgroundId]);
  const isSquare = background?.shape === 'square';

  const markerStyle: (ViewStyle | {})[] = [styles.souffleMarkerBase];

  if (souffle.isRevealed) {
    if (isSquare) {
      markerStyle.push(styles.souffleMarkerSquare, styles.souffleMarkerRevealed);
    } else {
      const color = REVEALED_COLORS[index % REVEALED_COLORS.length];
      markerStyle.push({
        backgroundColor: color,
        borderRadius: 8,
        borderColor: 'rgba(255, 255, 255, 0.5)',
      });
    }
  } else {
    markerStyle.push(styles.souffleMarkerCircle);
    if (canReveal) {
        markerStyle.push(styles.souffleMarkerCanReveal);
    }
    const color = unrevealedColors[index % unrevealedColors.length];
    markerStyle.push({ backgroundColor: color });
  }

  return (
    <Marker identifier={souffle.id} coordinate={souffle} onPress={() => onPress(souffle)} tracksViewChanges={false}>
      <AnimatedHalo isActive={canReveal} canReveal={canReveal && !souffle.isRevealed} isRevealed={souffle.isRevealed}>
        <WaveEffect isActive={canReveal && !souffle.isRevealed}>
          {isSquare && background.source ? (
              <ImageBackground source={background.source} style={markerStyle} imageStyle={{ borderRadius: 6 }}>
                  <View style={styles.markerContentContainer}>
                      <Text style={styles.souffleMarkerEmoji}>{sticker?.emoji || '💬'}</Text>
                  </View>
              </ImageBackground>
          ) : (
            <View style={markerStyle}>
                <View style={styles.markerContentContainer}>
                    <Text style={styles.souffleMarkerEmoji}>{souffle.isRevealed ? (sticker?.emoji || '💬') : '🤫'}</Text>
                    {canReveal && !souffle.isRevealed && (
                    <FloatingParticle>
                        <View style={styles.canRevealMarkerBadge}><Eye size={10} color="#F9F7F4" /></View>
                    </FloatingParticle>
                    )}
                </View>
            </View>
          )}
        </WaveEffect>
      </AnimatedHalo>
    </Marker>
  );
});

const TicketMarker = React.memo(({ ticket, userLocation, onPress }: { ticket: SuspendedTicket; userLocation: any; onPress: (ticket: SuspendedTicket) => void }) => {
    const canClaim = useMemo(() => isWithinRevealDistance(userLocation.latitude, userLocation.longitude, ticket.latitude, ticket.longitude), [userLocation, ticket]);
    
    return (
        <Marker key={ticket.id} coordinate={ticket} tracksViewChanges={false}>
            <AnimatedHalo isActive={true} canReveal={canClaim}>
              <TouchableOpacity style={styles.ticketMarker} onPress={() => onPress(ticket)}>
                <Gift size={20} color="#C17B5C" />
              </TouchableOpacity>
            </AnimatedHalo>
        </Marker>
    );
});

const UserMarker = React.memo(({location}: {location: any}) => (
    <>
        <Circle center={location} radius={500} strokeColor="rgba(139, 125, 107, 0.3)" fillColor="rgba(139, 125, 107, 0.05)" strokeWidth={1} />
        <Circle center={location} radius={15} strokeColor="rgba(168, 200, 225, 0.8)" fillColor="rgba(168, 200, 225, 0.2)" strokeWidth={1} />
    </>
));

const OptimizedMapView = forwardRef<MapViewActions, OptimizedMapViewProps>(({ mode, onMarkerPress, onTicketPress, isEchoSimulationActive }, ref) => {
  const { location, loading: locationLoading } = useLocation();
  const { souffles, suspendedTickets } = useSouffle();
  const { t } = useLanguage();
  
  const internalMapRef = useRef<MapViewType | null>(null);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [isModeratedReading, setIsModeratedReading] = useState(true);

  useEffect(() => {
    const loadMapType = async () => {
        try {
            const savedMapType = await AsyncStorage.getItem(MAP_TYPE_STORAGE_KEY) as 'standard' | 'satellite' | 'hybrid' | null;
            if (savedMapType) setMapType(savedMapType);
        } catch (e) { console.error("Failed to load map type.", e); }
    };
    loadMapType();
  }, []);
  
  useEffect(() => {
    const loadSettings = async () => {
      const settingsData = await AsyncStorage.getItem('@souffle:privacy_settings');
      if (settingsData) {
        const settings = JSON.parse(settingsData);
        setIsModeratedReading(settings.moderatedReading ?? true);
      }
    };
    loadSettings();
  }, []);

  const displayedSouffles = useMemo(() => {
    if (!isModeratedReading) return souffles;
    return souffles.filter(souffle => {
      return souffle.moderation.status === 'clean' || souffle.moderation.status === 'approved';
    });
  }, [souffles, isModeratedReading]);

  const { places: echoPlaces } = useMemo(() => {
    if (isEchoSimulationActive && location) {
      return generateEchoes(souffles, location.latitude, location.longitude);
    }
    return { places: [], trails: [] };
  }, [isEchoSimulationActive, souffles, location]);

  useImperativeHandle(ref, () => ({
    locateMe: () => handleMapAction(DEFAULT_ZOOM),
    zoomIn: () => handleMapAction(zoomLevel + 1),
    zoomOut: () => handleMapAction(zoomLevel - 1),
    toggleMapType: () => {
        setMapType(current => {
            const newMapType = current === 'standard' ? 'satellite' : 'standard';
            AsyncStorage.setItem(MAP_TYPE_STORAGE_KEY, newMapType).catch(e => {
                console.error("Failed to save map type.", e);
            });
            return newMapType;
        });
    },
  }));

  const handleMapAction = (newZoom: number) => {
    if (internalMapRef.current && location) {
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      setZoomLevel(clampedZoom);
      const delta = calculateDelta(clampedZoom);
      internalMapRef.current.animateToRegion({ ...location, latitudeDelta: delta, longitudeDelta: delta }, 500);
    }
  };

  if (!location) {
    return (
      <View style={styles.mapUnavailableOverlay}>
        <ActivityIndicator size="large" color="#A8C8E1" />
        <Text style={styles.mapUnavailableText}>{locationLoading ? t('locating') : t('locationRequiredToExplore')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.mobileMapContainer}>
      <MapView 
        ref={internalMapRef} 
        style={styles.fullMap} 
        initialRegion={{ ...location, latitudeDelta: calculateDelta(DEFAULT_ZOOM), longitudeDelta: calculateDelta(DEFAULT_ZOOM) }} 
        showsUserLocation 
        mapType={mapType} 
        onRegionChangeComplete={(region: Region) => setZoomLevel(Math.log(360 / region.latitudeDelta) / Math.LN2)} 
      >
        {location && <UserMarker location={location} />}
        
        {!isEchoSimulationActive && (
          <>
            {displayedSouffles.map((souffle, index) => (
              <SouffleMarker key={souffle.id} souffle={souffle} userLocation={location} onPress={onMarkerPress} index={index} />
            ))}
            {location && suspendedTickets.map((ticket) => (
              <TicketMarker key={ticket.id} ticket={ticket} userLocation={location} onPress={onTicketPress} />
            ))}
          </>
        )}

        {isEchoSimulationActive && (
          <>
            {echoPlaces.map(place => (
              <Marker key={place.id} coordinate={place} tracksViewChanges={false}>
                <View style={[styles.echoPlaceMarker, { backgroundColor: place.colorTheme }]}>
                    <Text style={styles.echoPlaceText}>{place.poeticEmote}</Text> 
                </View>
              </Marker>
            ))}
          </>
        )}
      </MapView>
    </View>
  );
});

export default OptimizedMapView;

const styles = StyleSheet.create({
  mobileMapContainer: { flex: 1, backgroundColor: '#F9F7F4' },
  fullMap: { ...StyleSheet.absoluteFillObject },
  mapUnavailableOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F7F4' },
  mapUnavailableText: { fontSize: 15, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic', marginTop: 20 },
  souffleMarkerBase: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2, overflow: 'hidden' },
  souffleMarkerCircle: { borderRadius: 19, borderColor: 'rgba(255, 255, 255, 0.9)' },
  souffleMarkerSquare: { borderRadius: 8, borderColor: 'rgba(255, 255, 255, 0.9)' },
  souffleMarkerRevealed: { borderColor: '#F4E4BC' },
  souffleMarkerCanReveal: { width: 48, height: 48, borderRadius: 24, borderColor: 'rgba(168, 200, 225, 0.6)' },
  markerContentContainer: { flex: 1, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  souffleMarkerEmoji: { fontSize: 18, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  canRevealMarkerBadge: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#A8C8E1', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 2 },
  ticketMarker: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(252, 237, 230, 0.9)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(193, 123, 92, 0.8)', shadowColor: '#C17B5C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 },
  echoPlaceMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)'
  },
  echoPlaceText: {
    color: '#FFFFFF',
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});