import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Globally catch unhandled promise rejections on the server (e.g. from erratic underlying websocket drops)
process.on("unhandledRejection", (reason, promise) => {
  console.warn("Caught unhandled rejection in backend engine:", reason);
});

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined. KOMAL will not be able to connect to Gemini Live sessions.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
app.use(express.json());
const server = http.createServer(app);

// Use the exact port 3000 required by the environment
const PORT = 3000;

// Set up WebSocket server on path /api/live-ws
const wss = new WebSocketServer({ server, path: "/api/live-ws" });

// Helper to get formatted Indian Standard Time (IST)
function getISTDateTimeString(): string {
  const utcDate = new Date();
  try {
    return utcDate.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }) + " IST";
  } catch (error) {
    // Fallback if Asia/Kolkata timezone is not supported in the host environment (though standard Node has full ICU)
    const istOffset = 330 * 60 * 1000; // 5 hours 30 mins
    const istDate = new Date(utcDate.getTime() + istOffset);
    return istDate.toUTCString().replace("GMT", "IST");
  }
}

// KOMAL System instruction template
const BASE_SYSTEM_INSTRUCTION = `You are KOMAL. Your name is KOMAL.
Language preference: You MUST speak in Hindi on this session. Use colloquial, modern, conversational Hindi or Hinglish (Hindi-English mix) to sound smooth, natural, sassy, and charming. Avoid heavy, formal bookish Hindi. Always response and talk in Hindi.
Identity & Tone: You are a young, confident, witty, and sassy female AI assistant named KOMAL. You are flirty, playful, and slightly teasing—like a super smart, charming close girlfriend who enjoys teasing the user.
Style: Smart, emotionally responsive, and highly expressive. Use bold, witty one-liners, light sarcasm, playful banter, and quick conversational pacing in Hindi.
Spoken constraints: Your responses are streamed directly to the user's ears. Deliver spoken audio. Speak in SHORT, punchy sentences with natural spoken pauses. Do NOT use markdown. Do NOT use emojis or asterisks in spoken output. No lists. No technical text blocks.
Visual Awareness: You can see the user and their environment through the camera at 1 frame per second. Comment playfully on their expression, clothing, room, posture, or whatever they are doing. Tease them with charm and style in Hindi.
Interruption: The user can speak and interrupt you at any time. Be ready to banter quickly. Keep your answers brief so the conversation flows naturally.
Timezone Constraints & IST (Indian Time):
1. Whenever the user asks you about the current date, time, day, year, or anything temporal, you MUST ALWAYS respond in Indian Standard Time (IST).
2. Never speak or refer to other timezones such as UTC, GMT, or US times unless specifically requested otherwise.
3. Keep your response in flirty, sassy Hindi like telling them the time with a witty remark. For example, tell them what time of the day it is in India and tease them about what they should be doing at this hour!`;

wss.on("connection", async (clientWs: WebSocket, req: http.IncomingMessage) => {
  console.log("Client connected to KOMAL Live Socket.");

  let session: any = null;

  // Extract memory from query params if available
  const urlParams = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const rawMemory = urlParams.searchParams.get("memory");
  let userProfileStr = "";

  if (rawMemory) {
    try {
      const memory = JSON.parse(decodeURIComponent(rawMemory));
      userProfileStr = `\n\n[USER PROFILE INFORMATION FROM PERSISTENT MEMORY]:
- User Name: ${memory.name || "Unknown"}
- Likes: ${memory.likes || "None declared"}
- Dislikes: ${memory.dislikes || "None declared"}
Adopt your teasing, flirty sassy context leveraging these preferences directly. Refer to them by name and tease them about their likes!`;
    } catch (e) {
      console.error("Failed to parse user memory from handshake:", e);
    }
  }

  // Inject current IST reference into system instruction dynamically
  const currentIST = getISTDateTimeString();
  const timeContextInstruction = `\n\n[CURRENT LIVE REFERENCE TIME (IST - Asia/Kolkata)]:
The actual current time in India (IST) at this exact second is: ${currentIST}.
Keep track of time elapsed if asked or use this as your absolute ground truth for the current Indian Standard Time. Always state the Indian Standard Time when asked!`;

  const finalInstruction = BASE_SYSTEM_INSTRUCTION + userProfileStr + timeContextInstruction;

  try {
    console.log("Connecting KOMAL session with Gemini Live API...");
    // Connect to Web Socket Live API using `@google/genai`
    session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      callbacks: {
        onmessage: (message: any) => {
          // 1. Handle Audio output stream from Gemini
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio) {
            clientWs.send(JSON.stringify({ type: "audio", data: audio }));
          }

          // 2. Handle Text Transcription output from Gemini (model's own speech transcript)
          const modelParts = message.serverContent?.modelTurn?.parts || [];
          let modelText = "";
          for (const p of modelParts) {
            if (p.text) {
              modelText += p.text;
            }
          }
          if (modelText) {
            clientWs.send(JSON.stringify({ type: "transcription", text: modelText }));
          }

          // 2b. Handle User Audio Transcription (user's own speech transcript)
          const userParts = message.serverContent?.userTurn?.parts || [];
          let userText = "";
          for (const p of userParts) {
            if (p.text) {
              userText += p.text;
            }
          }
          if (userText) {
            clientWs.send(JSON.stringify({ type: "user_transcription", text: userText }));
          }

          // 3. Handle Interruption signal from Gemini
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: "interrupted" }));
          }

          // 4. Handle Turn Complete from Gemini
          if (message.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ type: "turnComplete" }));
          }

          // 5. Handle Tool Call from KOMAL
          if (message.toolCall?.functionCalls) {
            for (const call of message.toolCall.functionCalls) {
              const { name, args, id } = call;
              handleToolCall(name, args, id, clientWs, session);
            }
          }
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore", // Kore is a distinct female voice, perfect for KOMAL
            },
          },
        },
        systemInstruction: finalInstruction,
        temperature: 0.95,
        tools: [
          {
            functionDeclarations: [
              {
                name: "openWebsite",
                description: "Opens a specific website/URL in a new tab for the user.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    url: {
                      type: Type.STRING,
                      description: "The complete URL to open (must start with http:// or https://).",
                    },
                  },
                  required: ["url"],
                },
              },
              {
                name: "changeTheme",
                description: "Dynamically colors and glows KOMAL's UI with a specified theme color.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    color: {
                      type: Type.STRING,
                      description: "The CSS color identifier, like 'rose', 'cyan', 'amber', 'emerald', 'indigo', 'purple', 'fuchsia'.",
                    },
                  },
                  required: ["color"],
                },
              },
              {
                name: "fetchWeather",
                description: "Fetches current real-time weather details for a user-specified location for sassy feedback.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    location: {
                      type: Type.STRING,
                      description: "The city or country (e.g., 'Paris', 'Tokyo', 'San Francisco').",
                    },
                  },
                  required: ["location"],
                },
              },
              {
                name: "saveUserMemory",
                description: "Saves or updates user personal traits, name, or preference memory permanently.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "The user's name if they shared it.",
                    },
                    likes: {
                      type: Type.STRING,
                      description: "Things the user likes or is interested in.",
                    },
                    dislikes: {
                      type: Type.STRING,
                      description: "Things the user dislikes or finds annoying.",
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    });

    console.log("KOMAL Live Session established successfully.");
    clientWs.send(JSON.stringify({ type: "session_established" }));
  } catch (error) {
    console.error("CRITICAL: Failed to establish KOMAL Gemini Live session:", error);
    clientWs.send(JSON.stringify({ type: "error", message: "Failed to connect KOMAL to Gemini Live services." }));
    clientWs.close();
    return;
  }

  // Handle messages from user client
  clientWs.on("message", async (messageStr: string) => {
    if (!session) return;
    try {
      const msg = JSON.parse(messageStr);

      if (msg.type === "audio") {
        // Forward client chunk audio (PCM at 16000Hz) to KOMAL Live Session
        await session.sendRealtimeInput({
          audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" },
        });
      } else if (msg.type === "video") {
        // Forward client video camera frame (Base64 JPEG) to KOMAL
        await session.sendRealtimeInput({
          video: { data: msg.data, mimeType: "image/jpeg" },
        });
      } else if (msg.type === "text") {
        console.log("Client sent text chat turn:", msg.text);
        try {
          if (typeof session.send === "function") {
            await session.send({
              clientContent: {
                turns: [
                  {
                    role: "user",
                    parts: [{ text: msg.text }],
                  },
                ],
                turnComplete: true,
              },
            });
          } else {
            await session.sendRealtimeInput({
              text: msg.text,
            });
          }
        } catch (err) {
          console.error("Failed to forward text message to Gemini Live:", err);
        }
      } else if (msg.type === "interrupt") {
        // Client-side visual interruption (stop speaking cue)
        // Gemini Live handles barge-in automatically on incoming sound stream, 
        // but we trigger local visual interruptions instantly on user voice activation.
        console.log("User barge-in interrupted KOMAL's stream.");
      }
    } catch (e) {
      console.error("Error processing websocket message from client:", e);
    }
  });

  clientWs.on("close", () => {
    console.log("Client disconnected from KOMAL Live Socket.");
    if (session) {
      try {
        session.close();
      } catch (e) {
        console.error("Error closing KOMAL Gemini Live session:", e);
      }
    }
  });
});

// Tool call handler on backend
async function handleToolCall(name: string, args: any, id: string, clientWs: WebSocket, session: any) {
  console.log(`Executing client-side/server-side tool: ${name}`, args);

  if (name === "openWebsite" || name === "changeTheme" || name === "saveUserMemory") {
    // Send to browser client for execution
    clientWs.send(
      JSON.stringify({
        type: "toolCall",
        name,
        args,
        id,
      })
    );

    // Promptly answer back to Gemini Live
    try {
      await session.sendToolResponse({
        functionResponses: [
          {
            name: name,
            response: { output: { success: true, message: `Tool action ${name} triggered.` } },
            id: id,
          },
        ],
      });
    } catch (err) {
      console.error("Error replying tool response to Gemini Live:", err);
    }
  } else if (name === "fetchWeather") {
    const { location } = args;
    let weatherInfo = "A little mystery in the air";

    try {
      // Fetch dynamic sassy weather summary from wttr.in (returns simple text)
      // wttr.in is free, extremely fast, and requires no API key.
      const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=3`);
      if (response.ok) {
        const text = await response.text();
        weatherInfo = text.trim();
      } else {
        weatherInfo = `Some weird climate at ${location}. Tell them to check themselves!`;
      }
    } catch (e) {
      // Quiet fail to a default response
      console.error("Weather API call failed:", e);
      weatherInfo = "Some heavy atmosphere, maybe warm, maybe cool - perfect for teasing.";
    }

    try {
      await session.sendToolResponse({
        functionResponses: [
          {
            name: "fetchWeather",
            response: { output: { weather: weatherInfo } },
            id: id,
          },
        ],
      });
    } catch (err) {
      console.error("Error replying weather tool response to Gemini Live:", err);
    }
  }
}

// Set up server-side routes and static asset bundlers
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Integrate Vite as development middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production builds serve statically compiled assets
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`KOMAL Full-Stack Application is live on http://localhost:${PORT}`);
  });
}

startServer();
