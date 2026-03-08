import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();

app.use(cors({
  origin: ["https://ai-chatbot-brown-six-33.vercel.app", "http://localhost:5500", "http://127.0.0.1:5500"],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.post("/chat", async (req, res) => {
  const { message, messages } = req.body;

  let chatHistory = messages;

  // Backwards compatibility if only message was passed
  if (!chatHistory || !Array.isArray(chatHistory)) {
    chatHistory = [
      {
        role: "user",
        content: message || ""
      }
    ];
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: chatHistory,
      model: "llama-3.1-8b-instant"
    });

    const reply = chatCompletion.choices[0].message.content;
    res.json({ reply });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "AI Error" });
  }

});

app.get("/", (req, res) => {
  res.send("Chatbot API is running! Use POST /chat to interact with the bot.");
});

app.get("/chat", (req, res) => {
  res.send("This endpoint is designed for POST requests from the frontend chatbot. It is working correctly!");
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
