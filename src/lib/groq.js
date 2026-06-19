// ============================================================================
//  groq.js — Service IA Groq pour l'analyse des 5 Pourquoi (Innofaso NC)
//  Place ce fichier dans : src/lib/groq.js
//
//  CONFIGURATION : crée un fichier .env à la racine du projet (à côté de
//  package.json) et ajoute la ligne suivante avec ta clé API Groq :
//    VITE_GROQ_API_KEY=gsk_XXXXXXXXXXXXXXXXXXXXXXXX
//
// 
// ============================================================================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || 'groq-1.1-mini';

/**
 * Construit le contexte de la NC pour le prompt IA.
 * On envoie uniquement ce dont l'IA a besoin — pas de données sensibles inutiles.
 */
function construireContexteNC(form) {
  const parties = [];
  if (form.intitule)    parties.push(`Intitulé de la non-conformité : "${form.intitule}"`);
  if (form.description) parties.push(`Description : "${form.description}"`);
  if (form.service)     parties.push(`Service concerné : ${form.service}`);
  if (form.criticite)   parties.push(`Criticité : ${form.criticite}`);
  if (form.typeObjet?.length) parties.push(`Type d'objet : ${form.typeObjet.join(', ')}`);
  if (form.consequences) parties.push(`Conséquences : "${form.consequences}"`);
  return parties.length > 0 ? parties.join('\n') : 'Aucun contexte disponible';
}

/**
 * Libellés lisibles des 5M pour le prompt.
 */
const LIBELLES_M = {
  mainOeuvre: "Main d'œuvre (personnel, compétences, comportement)",
  methode:    'Méthode (procédures, instructions, modes opératoires)',
  materiel:   'Matériel (machines, équipements, outillages)',
  milieu:     'Milieu (environnement : température, humidité, espace)',
  matiere:    'Matière (matières premières, composants, fournitures)',
};

/**
 * Demande à Groq de proposer une cause ("Parce que…") pour un Pourquoi donné.
 *
 * @param {object} params
 * @param {string} params.pourquoi     - Question "Pourquoi ?" saisie par l'utilisateur
 * @param {string} params.causeM       - Cause 5M déjà identifiée pour cette branche
 * @param {string} params.axeM         - Clé de l'axe M (ex : 'mainOeuvre', 'methode'…)
 * @param {number} params.iteration    - Numéro de l'itération (1 à 5)
 * @param {Array}  params.historiqueIterations - Lignes précédentes [{pourquoi, parceque}]
 * @param {object} params.form         - Formulaire NC complet (pour contexte)
 * @param {string} params.apiKey       - Clé API Groq
 * @returns {Promise<string>}          - Proposition de cause (texte brut)
 */
export async function proposerCause({
  pourquoi,
  causeM,
  axeM,
  iteration,
  historiqueIterations = [],
  form,
  apiKey,
}) {
  if (!apiKey) throw new Error('Clé API Groq manquante. Vérifiez votre fichier .env (VITE_GROQ_API_KEY).');
  if (!pourquoi?.trim()) throw new Error('Saisissez d\'abord le champ "Pourquoi ?" avant de demander une suggestion.');

  const contexteNC = construireContexteNC(form);
  const libelleAxe = LIBELLES_M[axeM] || axeM;

  // Historique des itérations précédentes (chaîne de causalité déjà construite)
  let historiqueTexte = '';
  if (historiqueIterations.length > 0) {
    const lignesAvant = historiqueIterations
      .slice(0, iteration - 1)
      .filter((l) => l.pourquoi || l.parceque)
      .map((l, i) => `  Itération ${i + 1} — Pourquoi : "${l.pourquoi}" → Parce que : "${l.parceque}"`)
      .join('\n');
    if (lignesAvant) historiqueTexte = `\nChaîne causale précédente :\n${lignesAvant}\n`;
  }

  const prompt = `Tu es un expert en qualité industrielle spécialisé dans l'analyse des non-conformités (méthode ISO 9001 / 5M / 5 Pourquoi) pour des entreprises agroalimentaires et industrielles en Afrique de l'Ouest.

CONTEXTE DE LA NON-CONFORMITÉ :
${contexteNC}

AXE D'ANALYSE (5M) : ${libelleAxe}
Cause 5M identifiée : "${causeM || 'non renseignée'}"
${historiqueTexte}
TÂCHE — Itération ${iteration} de la méthode des 5 Pourquoi :
L'utilisateur a posé la question : "${pourquoi}"

Propose une réponse concise et concrète au "Parce que…" pour cette question, en tenant compte du contexte de la NC, de l'axe 5M et de la chaîne causale déjà établie.

RÈGLES IMPÉRATIVES :
- Réponds UNIQUEMENT avec la cause proposée (pas de phrase d'introduction, pas d'"Explication :", pas de guillemets).
- Maximum 2 phrases courtes.
- La cause doit être spécifique, actionnable, et directement liée à l'axe "${libelleAxe}".
- Si c'est l'itération ${iteration} > 1, la cause doit être plus profonde / racine que la précédente.
- Langue : français professionnel.`;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 120,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `Erreur Groq HTTP ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const texte = data.choices?.[0]?.message?.content?.trim();
  if (!texte) throw new Error('Réponse vide reçue de Groq.');

  return texte;
}