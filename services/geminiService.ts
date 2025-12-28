
import { GoogleGenAI } from "@google/genai";
import { TimeEntry } from "../types";

// Always use process.env.API_KEY directly for initialization as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAIAnalysis = async (entries: TimeEntry[]) => {
  if (entries.length === 0) return "Aucune donnée disponible pour l'analyse.";

  const prompt = `
    Analyse les données de saisie de temps suivantes pour un cabinet d'audit et d'expertise.
    Données: ${JSON.stringify(entries)}
    
    Fournis un résumé professionnel de la productivité, identifie les dossiers les plus chronophages et suggère des optimisations pour le manager.
    Réponds en français, avec un ton professionnel. Utilise des puces pour la lisibilité.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Extract text directly from the response object's .text property and ensure a string is returned
    return response.text || "Désolé, l'analyse IA n'a pas pu être générée.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Désolé, l'analyse IA n'est pas disponible pour le moment.";
  }
};
