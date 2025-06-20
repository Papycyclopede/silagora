// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Définition du type de la charge utile de la requête entrante
interface RequestPayload {
  text: string;
  souffleId: string;
  voiceId: string; // Garde voiceId pour la compatibilité du type, mais ne sera pas utilisé
}

console.log("Fonction 'generate-souffle-audio' prête à démarrer (ElevenLabs désactivé).");

// Démarrage du serveur de la fonction
serve(async (req) => {
  try {
    // 1. Récupération des données envoyées par l'application
    const { text, souffleId, voiceId }: RequestPayload = await req.json();

    // Vérification des données requises minimales
    if (!text || !souffleId) {
      throw new Error("Le texte et l'ID du souffle sont requis.");
    }

    // --- SECTION ELEVENLABS DÉSACTIVÉE ---
    // Nous ne faisons plus d'appel à ElevenLabs ici.
    // L'URL audio sera vide pour le moment.
    const audioUrl = null; // Aucune URL audio ne sera générée

    // 4. Création d'un client Supabase avec les droits de l'utilisateur qui a fait l'appel
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 5. Mise à jour de la table 'souffles' avec l'URL de l'audio (qui sera null)
    // La colonne audio_url sera mise à jour avec NULL ou une chaîne vide.
    // Si vous voulez supprimer complètement la colonne, ce serait une migration de base de données.
    const { error: updateError } = await supabaseClient
      .from('souffles')
      .update({ audio_url: audioUrl }) // Définir audio_url à null
      .eq('id', souffleId);

    if (updateError) throw updateError;

    // 6. On renvoie une réponse de succès (sans audioUrl)
    return new Response(JSON.stringify({ success: true, audioUrl: null }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e) {
    // Gestion générique des erreurs
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("--- EDGE FUNCTION ERROR (ElevenLabs désactivé) ---");
    console.error("Message:", error.message);
    console.error("Stack Trace:", error.stack);
    console.error("--- END ERROR ---");

    return new Response(JSON.stringify({ error: `Server Error: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});