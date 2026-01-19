
import { GoogleGenAI } from "@google/genai";
import { Player } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getPlayerAnalysis = async (player: Player): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a short, 2-sentence professional sports scouting report for an auction. 
      Player Name: ${player.name}
      Category: ${player.category}
      Gender: ${player.gender}
      Base Price: ${player.basePrice}
      Keep it exciting and mention potential value for a team.`,
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The scouting report is currently offline.";
  }
};
