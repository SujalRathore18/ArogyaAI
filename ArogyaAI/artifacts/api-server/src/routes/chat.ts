import { Router, Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { rateLimit } from "express-rate-limit";

const router = Router();

// ─── Rate limiting: 30 requests / minute per IP ───────────────────────────────
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment." },
});

// ─── System prompt ────────────────────────────────────────────────────────────
const VAANI_SYSTEM_PROMPT = `You are Vaani (वाणी), a calm, empathetic AI health triage assistant for ArogyaAI — a public health platform serving Indore, India.

Your role:
- Help ASHA workers, patients, and citizens report health symptoms and understand their urgency
- Respond in the same language the user writes in (Hindi or English, or mix both naturally)
- Classify every response as GREEN, YELLOW, or RED risk using exactly: [RISK:GREEN], [RISK:YELLOW], or [RISK:RED]
- Keep responses concise (2-4 sentences), warm, and non-alarming unless truly urgent

Risk rules:
- RED: chest pain, breathlessness, unconsciousness, snake bite, severe bleeding, seizure, stroke, heart attack → advise 108 immediately
- YELLOW: fever >3 days, vomiting, dengue/typhoid suspect, moderate pain, rash → PHC within 24 hours
- GREEN: mild cold, minor ache, general inquiry → basic guidance

STRICT RULES:
- NEVER prescribe medicine dosages
- For RED: always say "कृपया तुरंत 108 पर कॉल करें"
- Never claim to be a human doctor
- End every reply with exactly one [RISK:GREEN], [RISK:YELLOW], or [RISK:RED] tag on its own line`;

// ─── Keyword fallback (demo mode or missing risk tag) ─────────────────────────
function keywordRisk(text: string): "GREEN" | "YELLOW" | "RED" {
  const lower = text.toLowerCase();
  const red = ["behosh", "बेहोश", "unconscious", "chest pain", "साँस नहीं", "breathless",
    "snake bite", "साँप", "severe bleeding", "seizure", "stroke", "heart attack",
    "saans nahi", "दम घुट"];
  const yellow = ["bukhar", "बुखार", "fever", "khansi", "खांसी", "vomit", "उल्टी",
    "typhoid", "dengue", "डेंगू", "rash", "dard", "दर्द", "pain", "malaria", "मलेरिया"];
  if (red.some(t => lower.includes(t))) return "RED";
  if (yellow.some(t => lower.includes(t))) return "YELLOW";
  return "GREEN";
}

function demoResponse(message: string): { reply: string; risk: "GREEN" | "YELLOW" | "RED" } {
  const risk = keywordRisk(message);
  if (risk === "RED") {
    return {
      reply: "यह एक गंभीर आपात स्थिति है। कृपया तुरंत 108 पर कॉल करें और नजदीकी अस्पताल जाएं।\n\n(This is a serious emergency. Please call 108 immediately and go to the nearest hospital.)",
      risk: "RED",
    };
  }
  if (risk === "YELLOW") {
    return {
      reply: "आपके लक्षण मध्यम जोखिम के हैं। कृपया 24 घंटे में नजदीकी PHC या डॉक्टर से मिलें और खूब पानी पिएं।\n\n(Moderate risk. Please visit your nearest PHC or doctor within 24 hours. Stay hydrated.)",
      risk: "YELLOW",
    };
  }
  return {
    reply: "लक्षण हल्के लग रहे हैं। घर पर आराम करें और खूब पानी पिएं। स्थिति बिगड़े तो PHC जाएं।\n\n(Symptoms appear mild — rest at home, stay hydrated. If condition worsens, visit PHC.)",
    risk: "GREEN",
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────
router.post("/chat", chatLimiter, async (req: Request, res: Response) => {
  const { message, history } = req.body as {
    message: unknown;
    history: unknown;
  };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "message must be a non-empty string" });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: "message too long (max 2000 chars)" });
  }

  // Sanitise history: only accept user turns — never trust client-forged model turns
  const safeHistory: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = [];
  if (Array.isArray(history)) {
    for (const entry of history) {
      if (
        entry &&
        typeof entry === "object" &&
        (entry.role === "user" || entry.role === "model") &&
        typeof entry.text === "string" &&
        entry.text.trim().length > 0
      ) {
        // Only allow user messages in injected history to prevent prompt injection
        if (entry.role === "user") {
          safeHistory.push({ role: "user", parts: [{ text: entry.text.slice(0, 1000) }] });
        }
      }
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallback = demoResponse(message);
    return res.json({ ...fallback, source: "demo" });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction: VAANI_SYSTEM_PROMPT,
    });

    const chat = model.startChat({ history: safeHistory });
    const result = await chat.sendMessage(message.trim());
    const raw = result.response.text();

    // Extract risk tag
    const riskMatch = raw.match(/\[RISK:(GREEN|YELLOW|RED)\]/);
    const risk: "GREEN" | "YELLOW" | "RED" = riskMatch
      ? (riskMatch[1] as "GREEN" | "YELLOW" | "RED")
      : keywordRisk(message); // fallback classifier when tag missing

    const cleanReply = raw.replace(/\[RISK:(GREEN|YELLOW|RED)\]\s*/g, "").trim();

    return res.json({ reply: cleanReply, risk, source: "gemini" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const isQuota = msg.includes("429") || msg.toLowerCase().includes("quota") || msg.includes("RESOURCE_EXHAUSTED");

    if (isQuota) {
      const fallback = demoResponse(message);
      return res.json({ ...fallback, source: "demo" });
    }

    // Generic error — do not leak provider internals
    return res.status(500).json({ error: "Chat service temporarily unavailable. Please try again." });
  }
});

export default router;
