import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clé pour le stockage de la préférence
const FONT_SCALE_KEY = '@silagora:font_scale';

// Définition des tailles possibles. On peut en ajouter d'autres si besoin.
type FontScale = 0.9 | 1.0 | 1.1; // Petite | Normale | Grande

// Interface pour notre contexte
interface FontContextType {
  fontScale: FontScale;
  changeFontSize: (scale: FontScale) => void;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

export function FontProvider({ children }: { children: ReactNode }) {
  // Par défaut, la taille est normale (1.0)
  const [fontScale, setFontScale] = useState<FontScale>(1.0);
  const [isLoading, setIsLoading] = useState(true);

  // Au démarrage, on charge la préférence sauvegardée
  useEffect(() => {
    const loadFontScale = async () => {
      try {
        const savedScale = await AsyncStorage.getItem(FONT_SCALE_KEY);
        if (savedScale !== null) {
          setFontScale(parseFloat(savedScale) as FontScale);
        }
      } catch (e) {
        console.error("Échec du chargement de la taille de police.", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadFontScale();
  }, []);

  // Fonction pour changer la taille et la sauvegarder
  const changeFontSize = async (scale: FontScale) => {
    setFontScale(scale);
    try {
      await AsyncStorage.setItem(FONT_SCALE_KEY, String(scale));
    } catch (e) {
      console.error("Échec de la sauvegarde de la taille de police.", e);
    }
  };

  // On attend que la préférence soit chargée pour éviter un "flash" de changement de police au démarrage
  if (isLoading) {
    return null;
  }

  return (
    <FontContext.Provider value={{ fontScale, changeFontSize }}>
      {children}
    </FontContext.Provider>
  );
}

// Hook personnalisé pour utiliser facilement notre contexte dans les composants
export const useFont = (): FontContextType => {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error('useFont doit être utilisé à l\'intérieur d\'un FontProvider');
  }
  return context;
};