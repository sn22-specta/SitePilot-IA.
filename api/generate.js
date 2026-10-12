
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      erreur: "Utilise la méthode POST."
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      erreur: "Configure OPENAI_API_KEY dans Vercel."
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
    process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const instructions = [
    "Tu es SitePilot IA, expert en création web.",
    "Réponds en français.",
    "Pour le mode plan, donne un plan structuré.",
    "Pour les modes generate et revise, fournis un document HTML complet.",
    "Le HTML doit inclure le CSS et le JavaScript nécessaires.",
    "Pour generate et revise, retourne uniquement le HTML, sans Markdown.",
    "Ne révèle jamais les clés API ni les secrets.",
    "N'affirme pas avoir exécuté une action non réalisée.",
    "Ne prétends pas qu'un paiement, un compte ou un backend fonctionne s'il ne fonctionne pas.",
    "Respecte précisément la demande de l'utilisateur."
  ].join(" ");

  try {
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          instructions,
          input: mission,
          max_output_tokens: 8192
        }),
        signal: AbortSignal.timeout(50000)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "OpenAI API error:",
        response.status,
        data.error?.code || data.error?.type || "API_ERROR"
      );

      if (response.status === 401) {
        return res.status(502).json({
          erreur: "Clé OpenAI invalide. Vérifie OPENAI_API_KEY dans Vercel."
        });
      }

      if (response.status === 429) {
        return res.status(502).json({
          erreur: "Limite ou quota OpenAI atteint. Vérifie ton usage et ta facturation API."
        });
      }

      if (response.status === 403) {
        return res.status(502).json({
          erreur: "Accès OpenAI refusé. Vérifie les autorisations du projet."
        });
      }

      if (response.status === 404) {
        return res.status(502).json({
          erreur: "Modèle OpenAI indisponible. Vérifie OPENAI_MODEL."
        });
      }

      return res.status(502).json({
        erreur: "Erreur OpenAI. Consulte les journaux Vercel."
      });
    }

    const texte = (data.output || [])
      .filter(item => item.type === "message")
      .flatMap(item => item.content || [])
      .filter(part => part.type === "output_text")
      .map(part => part.text || "")
      .join("")
      .trim();

    if (!texte) {
      return res.status(502).json({
        erreur: "OpenAI n'a renvoyé aucun texte."
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
          ? "Le délai de réponse OpenAI est dépassé."
          : "Impossible de contacter OpenAI."
    });
  }
};
