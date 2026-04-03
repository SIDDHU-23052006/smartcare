import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    const { message, vitals } = req.body;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are a medical assistant.

SpO2: ${vitals.spo2}
BPM: ${vitals.bpm}
Fall: ${vitals.fall}
Location: ${vitals.lat}, ${vitals.lon}`
    });

    const chat = model.startChat();

    const result = await chat.sendMessage(message);

    res.status(200).json({
      reply: result.response.text()
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "LLM failed" });
  }
}