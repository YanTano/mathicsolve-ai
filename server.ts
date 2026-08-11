import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { generateFallbackSolution } from "./src/utils/mathSolver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // Initialize Gemini client lazy/safe
  let ai: GoogleGenAI | null = null;
  function getGenAIClient(): GoogleGenAI | null {
    if (!ai && process.env.GEMINI_API_KEY) {
      try {
        ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      } catch (err) {
        console.error("Failed to initialize GoogleGenAI:", err);
      }
    }
    return ai;
  }

  // API Route: Math Solver
  app.post("/api/solve-math", async (req, res) => {
    try {
      const { image, text, topicHint } = req.body;

      if (!image && !text) {
        return res.status(400).json({
          isReadable: false,
          errorMessage: "Please provide either an image scan or a text math problem.",
        });
      }

      const client = getGenAIClient();

      if (!client) {
        // Fallback local solver for demo/keyless mode
        const fallbackSolution = generateFallbackSolution(text || "2x + 5 = 15");
        return res.json(fallbackSolution);
      }

      const systemInstruction = `You are MATHICSOLVE AI, a world-class futuristic AI math solver and tutor.
Your task is to analyze the user's input (image of handwritten/printed math equation or typed math text), recognize the mathematical equation or problem accurately, and compute a step-by-step solution.

RULES:
1. If the image/text is unreadable, extremely blurry, or does not contain any math problem, set "isReadable" to false.
2. Format all mathematical equations cleanly using standard readable math notation (e.g. 2x + 5 = 15, x = 5, x² - 5x + 6 = 0, \\int x^2 dx = x^3/3 + C).
3. "finalAnswer" must be clear and direct (e.g., "x = 5").
4. "steps" must be ordered sequentially (01, 02, 03) with clear titles and intermediate mathematical expressions.
5. "simpleExplanation" should be a concise 1-sentence summary suitable for quick reading.
6. "detailedExplanation" should be a clear paragraph explaining the math principles, formula rules, and logical flow.
7. "verification" should show a quick substitution or proof step if applicable.`;

      const promptParts: any[] = [];

      if (image) {
        // Remove base64 data URL prefix if present
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const mimeTypeMatch = image.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png";

        promptParts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        });
      }

      let textPrompt = "Analyze and solve this math problem with step-by-step explanation.";
      if (text) {
        textPrompt += ` User text problem: "${text}".`;
      }
      if (topicHint) {
        textPrompt += ` Topic hint: ${topicHint}.`;
      }
      promptParts.push({ text: textPrompt });

      const models = ["gemini-2.5-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"];
      let lastError: any = null;
      let parsedData: any = null;

      for (const model of models) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await client.models.generateContent({
              model,
              contents: { parts: promptParts },
              config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    isReadable: { type: Type.BOOLEAN },
                    problemDetected: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    finalAnswer: { type: Type.STRING },
                    steps: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          stepNumber: { type: Type.STRING },
                          title: { type: Type.STRING },
                          expression: { type: Type.STRING },
                          explanation: { type: Type.STRING },
                        },
                        required: ["stepNumber", "title", "expression"],
                      },
                    },
                    simpleExplanation: { type: Type.STRING },
                    detailedExplanation: { type: Type.STRING },
                    verification: { type: Type.STRING },
                  },
                  required: [
                    "isReadable",
                    "problemDetected",
                    "topic",
                    "finalAnswer",
                    "steps",
                    "simpleExplanation",
                    "detailedExplanation",
                  ],
                },
              },
            });

            if (response.text) {
              parsedData = JSON.parse(response.text);
              break; // Successfully solved
            }
          } catch (err: any) {
            lastError = err;
            const errStr = String(err?.message || JSON.stringify(err || {}));
            console.warn(`Gemini model '${model}' (attempt ${attempt + 1}) failed:`, errStr);

            // If 429 rate limit with a short retry delay (<=5s), wait and retry once
            if ((errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) && attempt === 0) {
              const retryMatch = errStr.match(/retry in ([0-9.]+)s/i);
              const retrySeconds = retryMatch ? parseFloat(retryMatch[1]) : 2.5;
              if (retrySeconds <= 5) {
                console.log(`Rate limited on ${model}. Waiting ${retrySeconds}s before retry...`);
                await new Promise((r) => setTimeout(r, Math.ceil(retrySeconds * 1000) + 500));
                continue;
              }
            }
            break; // Move immediately to next model in the list
          }
        }
        if (parsedData) break;
      }

      if (parsedData) {
        return res.json(parsedData);
      }

      console.error("All Gemini models failed:", lastError);

      let userFriendlyMessage = "Failed to process image with Gemini API.";
      const errStr = String(lastError?.message || JSON.stringify(lastError || {}));
      if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("Quota exceeded")) {
        const retryMatch = errStr.match(/retry in ([0-9.]+s)/i);
        const retryText = retryMatch ? ` Please retry in ${retryMatch[1]}.` : " Please wait 30 seconds before trying again.";
        userFriendlyMessage = `Gemini API Rate Limit / Quota Exceeded.${retryText} You can also add your own Gemini API key in Settings.`;
      }

      // If user provided text problem, attempt rule-based local solver
      if (text) {
        const localSolution = generateFallbackSolution(text);
        if (localSolution.isReadable) {
          return res.json(localSolution);
        }
      }

      const fallback = generateFallbackSolution(text || "");
      return res.json({
        ...fallback,
        errorMessage: userFriendlyMessage,
      });
    } catch (outerErr: any) {
      console.error("Outer error in /api/solve-math:", outerErr);
      const fallback = generateFallbackSolution(req.body?.text || "");
      return res.json({
        ...fallback,
        errorMessage: outerErr?.message || "An unexpected error occurred while processing your request.",
      });
    }
  });

  // API Route: Transcribe Audio
  app.post("/api/transcribe-audio", async (req, res) => {
    try {
      const { audio, mimeType = "audio/webm" } = req.body;
      if (!audio) {
        return res.status(400).json({ error: "No audio provided" });
      }

      const client = getGenAIClient();
      if (!client) {
        return res.status(500).json({ error: "Gemini API client not initialized" });
      }

      const cleanBase64 = audio.replace(/^data:audio\/\w+;base64,/, "");
      const models = ["gemini-2.5-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-2.0-flash"];

      for (const model of models) {
        try {
          const response = await client.models.generateContent({
            model,
            contents: {
              parts: [
                { inlineData: { mimeType, data: cleanBase64 } },
                { text: "Transcribe the spoken math problem in this audio into clean math notation." },
              ],
            },
            config: {
              systemInstruction: `You are a specialized mathematical speech-to-text transcriber for MATHICSOLVE AI. Convert spoken math into concise math symbols (e.g., 2x + 5 = 15). Output ONLY the math expression without quotes or conversational text.`,
            },
          });

          if (response.text) {
            return res.json({ text: response.text.trim() });
          }
        } catch (err: any) {
          console.warn(`Server audio transcribe error (${model}):`, err?.message || err);
        }
      }

      return res.status(500).json({ error: "Could not transcribe audio" });
    } catch (err: any) {
      console.error("Error in /api/transcribe-audio:", err);
      return res.status(500).json({ error: err?.message || "Internal server error" });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MATHICSOLVE AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
