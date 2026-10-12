// api/generate.js — Fonction serverless Vercel
export default async function handler(req, res) {
    // Autoriser uniquement POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ error: 'Le champ "prompt" est requis.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Clé API non configurée sur le serveur.' });
    }

    const systemPrompt = `Tu es un développeur web expert. Génère uniquement le code HTML et CSS complet, dans un seul fichier autonome, en te basant sur la demande de l'utilisateur. Utilise un design moderne, responsive et professionnel. Ne fournis AUCUN texte explicatif ni balise markdown, seulement le code HTML brut commençant par <!DOCTYPE html>.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-5',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                max_completion_tokens: 8000
                // ⚠️ Pas de "temperature" : GPT-5 la refuse.
                // ⚠️ Pas de "max_tokens" : utiliser "max_completion_tokens".
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const message = data.error?.message || `Erreur API (${response.status})`;
            return res.status(response.status).json({ error: message });
        }

        let html = data.choices?.[0]?.message?.content || '';

        // Nettoyage : enlève les éventuelles balises ```html ... ```
        html = html.replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim();

        // Sécurité minimale : on s'assure que c'est du HTML
        if (!html.toLowerCase().startsWith('<!doctype') && !html.toLowerCase().startsWith('<html')) {
            // On enveloppe si l'IA a renvoyé un fragment
            html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Site généré</title></head><body>${html}</body></html>`;
        }

        return res.status(200).json({ html });

    } catch (error) {
        console.error('Erreur serveur :', error);
        return res.status(500).json({ error: error.message || 'Erreur interne du serveur.' });
    }
}