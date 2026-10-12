// api/generate.js — Fonction serverless Vercel avec l'API Interactions de Gemini
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ error: 'Le champ "prompt" est requis.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Clé API Gemini non configurée sur le serveur.' });
    }

    // ⚠️ Nouveau modèle : gemini-3.8-flash (remplace gemini-2.0-flash)
    const MODEL = 'gemini-3.8-flash';
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/interactions';

    const systemPrompt = `Tu es un développeur web expert. Génère uniquement le code HTML et CSS complet, dans un seul fichier autonome, en te basant sur la demande de l'utilisateur. Utilise un design moderne, responsive et professionnel. Ne fournis AUCUN texte explicatif ni balise markdown, seulement le code HTML brut commençant par <!DOCTYPE html>.`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // ⚠️ La clé passe par l'en-tête x-goog-api-key
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                // ✅ Nouveau format : model + input + system_instruction
                model: MODEL,
                system_instruction: systemPrompt,
                input: prompt
                // Optionnel : contrôler le niveau de réflexion
                // generation_config: { thinking_level: 'low' }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const message = data.error?.message || `Erreur Gemini (${response.status})`;
            return res.status(response.status).json({ error: message });
        }

        // ✅ Nouveau chemin d'accès à la réponse : output_text
        let html = data.output_text || '';

        // Nettoyage des balises markdown éventuelles
        html = html.replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim();

        if (!html) {
            return res.status(500).json({ error: 'Réponse vide de Gemini.' });
        }

        // Sécurité : enveloppe si l'IA a renvoyé un fragment
        if (!html.toLowerCase().startsWith('<!doctype') && !html.toLowerCase().startsWith('<html')) {
            html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Site généré</title></head><body>${html}</body></html>`;
        }

        return res.status(200).json({ html });

    } catch (error) {
        console.error('Erreur serveur :', error);
        return res.status(500).json({ error: error.message || 'Erreur interne du serveur.' });
    }
}