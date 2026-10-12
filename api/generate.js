
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      erreur: "Utilise la méthode POST."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      erreur: "Configure GEMINI_API_KEY dans Vercel."
    });
  }

  const body = req.body || {};
  const mission =
    typeof body.mission === "string"
      ? body.mission.trim()
      : "";

  const mode = body.mode;

  if (!["generate", "plan", "revise"].includes(mode)) {
    return res.status(400).json({
      erreur: "Mode invalide."
    });
  }

  if (!mission || mission.length > 35000) {
    return res.status(400).json({
      erreur: "Demande vide ou trop longue."
    });
  }

  const model =
    process.env.GEMINI_MODEL || "gemini-2.5-flash";

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) +
        ":generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: [
                "Tu es SitePilot IA, expert en création web.",
                "Réponds en français.",
                "Pour plan, fournis une analyse structurée.",
                "Pour generate et revise, retourne un document",
                "HTML complet, sans Markdown.",
                "Ne révèle aucune clé API ni aucun secret.",
                "N'affirme pas avoir exécuté une action non réalisée.",
                "N'invente pas de backend, de paiement ou de connexion fonctionnelle."
              ].join(" ")
            }]
          },
          contents: [{
            role: "user",
            parts: [{ text: mission }]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192
          }
        }),
        signal: AbortSignal.timeout(80000)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        response.status,
        data.error?.status || "API_ERROR"
      );

      return res.status(502).json({
        erreur:
          "Gemini a refusé la demande. Vérifie la clé, " +
          "le modèle et les quotas dans Google AI Studio."
      });
    }

    const texte = (
      data.candidates?.[0]?.content?.parts || []
    )
      .map(part => part.text || "")
      .join("")
      .trim();

    if (!texte) {
      return res.status(502).json({
        erreur: "Gemini n'a renvoyé aucun texte."
      });
    }

    return res.status(200).json({
      reponse: texte
    });

  } catch (error) {
    console.error("SitePilot API error:", error.name);

    return res.status(502).json({
      erreur:
        error.name === "TimeoutError" ||
        error.name === "AbortError"
          ? "Le délai de réponse de Gemini est dépassé."
          : "Impossible de contacter Gemini."
    });
  }
};
