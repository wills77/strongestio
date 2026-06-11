import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Helper to instantiate the official GenAI client with correct telemetry header
const aiKey = process.env.GEMINI_API_KEY;

// Create lazy client
let ai: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!ai) {
    if (!aiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. StrongGestio AI will operate in simulation mode.");
    }
    ai = new GoogleGenAI({
      apiKey: aiKey || 'DUMMY_KEY_FOR_MOCK_FALLBACK',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Check Health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', datetime: new Date().toISOString() });
  });

  // AI Analysis & Strategic Reporting Router
  app.post('/api/ai/analyze', async (req, res) => {
    const { prompt, context, type } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Le paramètre prompt est requis.' });
    }

    // Prepare advanced background system context based on corporate state
    const companySummary = `
      SaaS StrongGestio Corp.
      - Sites : Paris (Siège), Lyon (Tech Hub), Marseille (Logistique), Abidjan (Filiale Afrique).
      - Indicateurs d'entreprise actuels en transit: ${JSON.stringify(context || {})}
    `;

    try {
      if (!aiKey) {
        // Safe mock return for simulation if No API Key is set to prevent crashes
        return res.json({
          text: `### 🤖 Analyse de Simulation StrongGestio AI (Clé API de secours)

Malheureusement, la clé de sécurité **GEMINI_API_KEY** n'a pas été fournie dans vos secrets d'environnement. Voici une analyse stratégique prédictive simulée par StrongGestio :

1. **Rapport d'activité & Performance** :
   La productivité globale est estimée à **88%**. Le site de **Paris Siège** mène avec un index de performance exceptionnel de **94/100**, suivi de près par **Abidjan Filiale** (**91/100**).
   
2. **Détection des Risques RH** :
   Le collaborateur *Luc Moreau* (Admin de Base de Données à Lyon Tech Hub) présente un risque d'usure professionnelle à surveiller en raison de récents arrêts de travail d'ordre médical. Il convient d'équilibrer sa charge de travail de gestion de clusters.
   
3. **Prévisions Financières** :
   Les revenus SaaS s'élèvent à un montant substantiel de **280k€**, tandis que les charges d'exploitation se stabilisent autour de **181k€**, générant un bénéfice solide de **+98.1k€**. L'outil estime une croissance de **+12%** du MRR d'ici le trimestre prochain.
   
4. **Recommandations stratégiques d'urgence** :
   * **Recommandation active** : Accélérer le recrutement du poste de *Manager Commercial Afrique* (candidate *Karim Ouedraogo*) pour rentabiliser l'infrastructure Abidjan Côte d'Ivoire.
   * **Recommandation financière** : Limiter l'usage de licences cloud redondantes avant l'audit du mois prochain.
   
*Note : Pour activer des réponses dynamiques en temps réel connectées au modèle d'intelligence artificielle de pointe de Google, veuillez configurer votre code d'accès GEMINI_API_KEY dans le panneau des secrets.*`
        });
      }

      const client = getGenAI();

      let systemInstruction = "Tu es 'StrongGestio AI', un directeur adjoint virtuel, expert stratégique de haut niveau et analyste d'entreprise pour les petites et moyennes entreprises (PME). Tu donnes des rapports clairs, pragmatiques et formates en Markdown (utilisant des listes, des titres, des pourcentages et des tableaux). Tu ne parles jamais de tes limites techniques ni du fait que tu es un modèle de langage. Réponds toujours en français professionnel et poli.";

      if (type === 'risk') {
        systemInstruction += " Concentre-toi spécifiquement sur les risques RH (absentéisme, baisse de performance, surcharge de travail d'après les salaires et départements) et formule des alertes concrètes.";
      } else if (type === 'finance') {
        systemInstruction += " Concentre-toi spécifiquement sur le bilan financier, le calcul des flux de trésorerie, la rentabilité, et propose des prévisions et budgets pour les trimestres à venir.";
      } else if (type === 'report') {
        systemInstruction += " Génère un rapport annuel global d'administration d'entreprise complet et structuré.";
      }

      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `
          CONTEXTE DE L'ENTREPRISE:
          ${companySummary}

          PROMPT DE L'UTILISATEUR:
          ${prompt}
        `,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      res.status(500).json({ error: 'Une erreur est survenue lors de la communication avec l\'IA Google Gemini : ' + (error.message || error) });
    }
  });

  // Serve static assets or mount Vite Developer server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[StrongGestio Server] En écoute sur le port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Echec au démarrage de StrongGestio Server:', error);
});
