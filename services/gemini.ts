
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export async function analyzeLectures(images: string[]): Promise<AnalysisResult> {
  const model = 'gemini-3-flash-preview';
  
  const imageParts = images.map(data => ({
    inlineData: {
      data: data.split(',')[1],
      mimeType: 'image/jpeg'
    }
  }));

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          ...imageParts,
          { text: "Analyze these lecture notes for a child's English lesson. Extract the main topic, key vocabulary words, and common phrases. Return the data in valid JSON format." }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyVocabulary: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedPhrases: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["summary", "keyVocabulary", "suggestedPhrases"]
      }
    }
  });

  return JSON.parse(response.text) as AnalysisResult;
}
