// server.js
import express from "express";
import { generate } from "./chatbot.js";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000; // frontend ke saath match karna best hai

app.get("/", (req, res) => {
  res.send("Welcome to ChatGPT!");
});

app.post("/api/chat", async (req, res) => {
  const { messages, thread_id } = req.body;

  if (!messages || !thread_id) {
    res.status(400).json({ message: "All fields are required!" });
    return;
  }

  console.log("Message", messages);

  const lastUserMessage = messages[messages.length - 1].content;

  const result = await generate(lastUserMessage, thread_id);
//   res.json({ messages: result });
  res.json(result);
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
