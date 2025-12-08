import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDocument = async (base64Data: string, mimeType: string): Promise<AnalysisResult> => {
  try {
    const modelId = "gemini-2.5-flash"; 

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            },
            {
              text: `Analiza este documento (parte de trabajo o albarán). 
              Tu tarea es extraer la siguiente información estructurada:
              
              1. **Nombre del Cliente**: Busca campos como "Cliente", "Empresa", o el nombre en la cabecera. Si no estás seguro, pon "Desconocido".
              2. **Horas Totales**: Busca campos de "Horas", "Tiempo empleado", "Mano de obra". Suma el total si hay varias líneas. Si no hay horas, pon 0.
              3. **Incidencia Resuelta**: Determina si el trabajo ha finalizado o la incidencia está resuelta (busca checkmarks, textos como "Finalizado", "Resuelto", "Terminado"). Devuelve true o false.
              4. **Materiales**: Extrae una lista de productos o materiales usados (Sección "Materiales", "Repuestos", "Productos"). Extrae el nombre y la cantidad (unidades).
              
              Responde estrictamente en formato JSON.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clientName: {
              type: Type.STRING,
              description: "El nombre extraído del cliente o empresa."
            },
            confidence: {
              type: Type.NUMBER,
              description: "Nivel de confianza de 0 a 1."
            },
            data: {
              type: Type.OBJECT,
              properties: {
                hours: { type: Type.NUMBER, description: "Total de horas de mano de obra." },
                isResolved: { type: Type.BOOLEAN, description: "¿El trabajo está marcado como resuelto/finalizado?" },
                materials: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      units: { type: Type.NUMBER }
                    }
                  }
                }
              },
              required: ["hours", "isResolved", "materials"]
            }
          },
          required: ["clientName", "confidence", "data"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const result = JSON.parse(text) as AnalysisResult;
    return result;

  } catch (error) {
    console.error("Error analyzing document with Gemini:", error);
    return {
      clientName: "Error de lectura",
      confidence: 0,
      data: {
        hours: 0,
        isResolved: false,
        materials: []
      }
    };
  }
};