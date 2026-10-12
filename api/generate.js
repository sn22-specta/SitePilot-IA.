// api/generate.js — Version corrigée avec un modèle Groq actuel
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Le champ "prompt" est requis.' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Clé API Groq non configurée.' });
    }

    const systemPrompt = `Génère UNIQUEMENT un fichier HTML complet avec CSS inline moderne et responsive. Aucun texte explicatif, aucune balise markdown. Commence par <!DOCTYPE html>.`;
    const userPrompt = prompt.slice(0, 800);

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                // ✅ Modèle actuel : remplacez par 'openai/gpt-oss-120b' ou 'gemma2-9b-it' si besoin
                model: 'openai/gpt-oss-20b', 
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 4000,
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const message = data.error?.message || `Erreur Groq (${response.status})`;
            return res.status(response.status).json({ error: message });
        }

        let html = data.choices?.[0]?.message?.content || '';
        html = html.replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim();

        if (!html) {
            return res.status(500).json({ error: 'Réponse vide.' });
        }

        if (!html.toLowerCase().startsWith('<!doctype') && !html.toLowerCase().startsWith('<html')) {
            html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Site généré</title></head><body>${html}</body></html>`;
        }

        return res.status(200).json({ html });

    } catch (error) {
        console.error('Erreur :', error);
        return res.status(500).json({ error: error.message || 'Erreur serveur.' });
    }
}