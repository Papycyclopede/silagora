import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// On récupère les variables d'environnement avec des valeurs par défaut pour éviter les erreurs
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Declare the supabase variable at the top level
let supabase: any;

// On vérifie que les clés sont bien présentes et valides
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://your-project-ref.supabase.co' || supabaseAnonKey === 'your-anon-key-here') {
  console.warn("Les variables d'environnement Supabase ne sont pas configurées correctement.");
  console.warn("Veuillez configurer EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans votre fichier .env");
  
  // Créer un client factice pour éviter les erreurs de compilation
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOtp: () => Promise.resolve({ error: new Error('Supabase non configuré') }),
      verifyOtp: () => Promise.resolve({ error: new Error('Supabase non configuré') }),
      signOut: () => Promise.resolve({ error: null })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error('Supabase non configuré') })
        }),
        is: () => Promise.resolve({ data: [], error: null })
      }),
      insert: () => Promise.resolve({ error: new Error('Supabase non configuré') }),
      update: () => ({
        eq: () => Promise.resolve({ error: new Error('Supabase non configuré') })
      })
    }),
    rpc: () => Promise.resolve({ data: null, error: new Error('Supabase non configuré') }),
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => ({})
    }),
    removeChannel: () => {},
    functions: {
      invoke: () => Promise.resolve({ data: null, error: null })
    }
  };
} else {
  // On crée et on exporte le client Supabase avec gestion d'erreur
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // On spécifie d'utiliser AsyncStorage pour que la session de l'utilisateur persiste
        // même après la fermeture de l'application.
        // Only use AsyncStorage in browser environments to avoid "window is not defined" errors
        storage: typeof window !== 'undefined' ? AsyncStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la création du client Supabase:', error);
    // Créer un client factice en cas d'erreur
    supabase = {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOtp: () => Promise.resolve({ error: new Error('Erreur de configuration Supabase') }),
        verifyOtp: () => Promise.resolve({ error: new Error('Erreur de configuration Supabase') }),
        signOut: () => Promise.resolve({ error: null })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('Erreur de configuration Supabase') })
          }),
          is: () => Promise.resolve({ data: [], error: null })
        }),
        insert: () => Promise.resolve({ error: new Error('Erreur de configuration Supabase') }),
        update: () => ({
          eq: () => Promise.resolve({ error: new Error('Erreur de configuration Supabase') })
        })
      }),
      rpc: () => Promise.resolve({ data: null, error: new Error('Erreur de configuration Supabase') }),
      channel: () => ({
        on: () => ({ subscribe: () => {} }),
        subscribe: () => ({})
      }),
      removeChannel: () => {},
      functions: {
        invoke: () => Promise.resolve({ data: null, error: null })
      }
    };
  }
}

// Export the supabase client at the top level
export { supabase };