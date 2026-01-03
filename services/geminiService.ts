import { GoogleGenAI, Type } from "@google/genai";
import { Book } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// We define a partial book structure for the AI to return
// We don't ask AI for user-specific fields like currentPage
interface AISuggestedBook {
  title: string;
  author: string;
  description: string;
  estimatedPages: number;
}

export const searchBooksWithGemini = async (query: string): Promise<AISuggestedBook[]> => {
  if (!query) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search for popular young adult or juvenile books matching the query: "${query}". 
      Return a list of 5 best matches. Ensure titles and authors are accurate. 
      For description, provide a very short 1-sentence hook.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              description: { type: Type.STRING },
              estimatedPages: { type: Type.NUMBER },
            },
            required: ["title", "author", "estimatedPages"],
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AISuggestedBook[];
    }
    return [];
  } catch (error) {
    console.error("Error searching books:", error);
    return [];
  }
};

export const getCreativePrompt = async (bookTitle: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate a fun, creative art challenge for a young reader who just finished reading "${bookTitle}". 
            Keep it short, encouraging, and specific (e.g., "Draw the scene where...").`
        });
        return response.text || "¡Dibuja tu escena favorita!";
    } catch (error) {
        return "¡Dibuja a tu personaje favorito de este libro!";
    }
}

export const summarizeReviews = async (bookTitle: string, reviews: string[]): Promise<string> => {
  if (reviews.length === 0) return "";

  try {
    const combinedReviews = reviews.join("\n\n");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a literary community manager. Summarize the following user reviews for the book "${bookTitle}".
      
      Reviews:
      ${combinedReviews}
      
      Your goal is to provide a "Community Consensus".
      1. What do people generally love?
      2. Any common complaints?
      3. What is the vibe (emotional/action/etc)?
      
      Keep the summary short (max 80 words), fun, and engaging for a young adult audience. Use emojis.
      Format it as a single coherent paragraph.`
    });
    return response.text || "No se pudo generar un resumen.";
  } catch (error) {
    console.error("Error summarizing reviews:", error);
    return "La comunidad tiene opiniones mixtas, ¡lee las reseñas para saber más!";
  }
};