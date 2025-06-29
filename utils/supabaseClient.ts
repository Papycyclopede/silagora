import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Création d'un client Supabase factice pour permettre à l'application de fonctionner sans backend
console.warn("⚠️ SUPABASE DÉSACTIVÉ: Mode démo activé - aucune connexion à la base de données");

// Client Supabase factice qui simule toutes les méthodes nécessaires
// mais ne fait aucune requête réelle à un backend
const supabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOtp: () => Promise.resolve({ error: null, data: { session: null } }),
    verifyOtp: () => Promise.resolve({ error: null, data: { session: null, user: { id: 'demo-user-id' } } }),
    signOut: () => Promise.resolve({ error: null })
  },
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: () => Promise.resolve({ data: null, error: null })
      }),
      is: (column: string, value: any) => Promise.resolve({ data: [], error: null }),
      order: (column: string, options?: any) => ({
        limit: (limit: number) => Promise.resolve({ data: [], error: null })
      })
    }),
    insert: (data: any) => Promise.resolve({ data: { id: 'demo-id' }, error: null }),
    update: (data: any) => ({
      eq: (column: string, value: any) => Promise.resolve({ error: null })
    })
  }),
  rpc: (func: string, params?: any) => Promise.resolve({ data: [], error: null }),
  channel: (name: string) => ({
    on: (event: string, filter: any) => ({ subscribe: (callback: Function) => {} }),
    subscribe: (callback?: Function) => ({})
  }),
  removeChannel: (channel: any) => {},
  functions: {
    invoke: (name: string, params?: any) => Promise.resolve({ data: null, error: null })
  }
};

// Export le client Supabase factice
export { supabase };