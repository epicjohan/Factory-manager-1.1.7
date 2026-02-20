
import { GoogleGenAI } from "@google/genai";

export const analyzeTicket = async (title: string, description: string): Promise<string> => {
  // Check of de API key aanwezig is in de environment
  if (!process.env.API_KEY) {
      console.warn("Gemini API key not found in process.env");
      return "AI Analyse niet beschikbaar: Geen API key geconfigureerd.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Gebruik gemini-3-flash-preview voor snelle text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Ik ben een onderhoudsmonteur voor CNC machines. 
      Geef me 3 mogelijke oorzaken en 3 oplossingen voor het volgende probleem:
      Titel: ${title}
      Omschrijving: ${description}
      
      Antwoord beknopt in het Nederlands.`,
    });
    
    return response.text || "Geen suggesties beschikbaar.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI Analyse tijdelijk niet beschikbaar.";
  }
};
