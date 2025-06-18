import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// On récupère les variables d'environnement
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// On vérifie que les clés sont bien présentes
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Les variables d'environnement Supabase ne sont pas définies. Veuillez créer un fichier .env");
}

// On crée et on exporte le client Supabase. C'est cet export qui résout la première erreur.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // On spécifie d'utiliser AsyncStorage pour que la session de l'utilisateur persiste
    // même après la fermeture de l'application.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});