import * as SecureStore from 'expo-secure-store';

class _SouffleStorage {
  async loadRevealedSouffles(): Promise<string[]> {
    try {
      const json = await SecureStore.getItemAsync('revealed_souffles');
      return json ? JSON.parse(json) : [];
    } catch (e) {
      console.error("Erreur lors du chargement des souffles révélés:", e);
      return [];
    }
  }

  async saveRevealedSouffles(ids: string[]): Promise<void> {
    try {
      await SecureStore.setItemAsync('revealed_souffles', JSON.stringify(ids));
    } catch (e) {
      console.error("Erreur lors de l'enregistrement des souffles révélés:", e);
    }
  }
}

export const SouffleStorage = new _SouffleStorage();
