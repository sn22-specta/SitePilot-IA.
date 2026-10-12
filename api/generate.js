// api/generate.js — Agent améliorateur de prompts (Groq, ultra-léger)
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { idea, type } = req.body || {};
    if (!idea || typeof idea !== 'string' || !idea.trim()) {
        return res.status(400).json({ error: 'Décris ton idée.' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Clé API Groq non configurée.' });
    }

    // Prompt système court = peu de tokens, résultat net
    const systemPrompt = `Tu es un expert en prompt engineering. Tu transformes une idée vague en un prompt clair, précis et structuré, prêt à être utilisé avec une IA. Réponds UNIQUEMENT avec le prompt final, sans introduction ni explication.`;

    const userPrompt = `Type de prompt : ${type || 'Texte'}
Idée de l'utilisateur : ${idea.slice(0, 500)}

Écris un prompt optimisé pour ce type d'IA. Sois concis (max 200 mots).`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-20b',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                // Prompt court = sortie courte, 500 tokens suffisent largement
                max_tokens: 500,
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const message = data.error?.message || `Erreur Groq (${response.status})`;
            return res.status(response.status).json({ error: message });
        }

        const prompt = (data.choices?.[0]?.message?.content || '').trim();

        if (!prompt) {
            return res.status(500).json({ error: 'Réponse vide.' });
        }

        return res.status(200).json({ prompt });

    } catch (error) {
        console.error('Erreur :', error);
        return res.status(500).json({ error: error.message || 'Erreur serveur.' });
    }
}