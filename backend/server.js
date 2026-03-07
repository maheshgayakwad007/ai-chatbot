import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.post("/chat", async (req, res) => {

  const { message } = req.body;

  try {

    const chatCompletion = await groq.chat.completions.create({
  messages: [
    {
      role: "user",
      content: message
    }
  ],
  model: "llama-3.1-8b-instant"
});

    const reply = chatCompletion.choices[0].message.content;

    res.json({ reply });

  } catch (error) {

    console.log(error);

    res.status(500).json({ error: "AI Error" });

  }

});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
