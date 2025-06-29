import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { useLocation } from '@/contexts/LocationContext';
import { useSouffle } from '@/contexts/SouffleContext';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, MessageSquare, Plus } from 'lucide-react-native';

export default function HomeTab() {
  const { location } = useLocation();
  const { souffles } = useSouffle();
  const { isAuthenticated, user } = useAuth();
  const [nearbySoufflesCount, setNearbySoufflesCount] = useState(0);

  useEffect(() => {
    if (location && souffles.length > 0) {
      // Simuler un comptage de souffles à proximité
      setNearbySoufflesCount(Math.min(souffles.length, 5));
    }
  }, [location, souffles]);

  return (
    <ImageBackground
      source={require('../../assets/images/fond.png')}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Silagora</Text>
          <Text style={styles.subtitle}>Murmures géolocalisés</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <MapPin size={24} color="#687fb2" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Votre position</Text>
              <Text style={styles.infoText}>
                {location 
                  ? `Latitude: ${location.latitude.toFixed(4)}, Longitude: ${location.longitude.toFixed(4)}` 
                  : "Localisation en cours..."}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <MessageSquare size={24} color="#8B7355" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Souffles à proximité</Text>
              <Text style={styles.infoText}>
                {location 
                  ? `${nearbySoufflesCount} souffles dans un rayon de 500m` 
                  : "Activez la localisation pour découvrir les souffles"}
              </Text>
            </View>
          </View>

          {isAuthenticated && (
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>
                Bienvenue {user?.pseudo || "explorateur"}
              </Text>
              <Text style={styles.welcomeText}>
                Explorez les murmures autour de vous ou déposez votre propre message.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.createButton}>
            <Plus size={24} color="#F9F5F0" />
            <Text style={styles.createButtonText}>Déposer un souffle</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(249, 245, 240, 0.7)',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontFamily: 'Georgia',
    color: '#687fb2',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#8B7355',
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#4D3B2F',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Georgia',
    color: '#8B7355',
  },
  welcomeCard: {
    backgroundColor: 'rgba(104, 127, 178, 0.15)',
    borderRadius: 15,
    padding: 20,
    marginVertical: 20,
  },
  welcomeTitle: {
    fontSize: 18,
    fontFamily: 'Georgia',
    color: '#4D3B2F',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: 'Georgia',
    color: '#8B7355',
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#8B7355',
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#F9F5F0',
    marginLeft: 10,
  },
});