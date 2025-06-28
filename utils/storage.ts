import AsyncStorage from '@react-native-async-storage/async-storage';

class _SouffleStorage {
  async loadRevealedSouffles(): Promise<string[]> {
    try {
      const json = await AsyncStorage.getItem('@souffle:revealed_souffles');
      return json ? JSON.parse(json) : [];
    } catch (e) {
      console.error("Erreur lors du chargement des souffles révélés:", e);
      return [];
    }
  }

  async saveRevealedSouffles(ids: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem('@souffle:revealed_souffles', JSON.stringify(ids));
    } catch (e) {
      console.error("Erreur lors de l'enregistrement des souffles révélés:", e);
    }
  }
}

export const SouffleStorage = new _SouffleStorage();