// src/utils/gemini.js
import axios from 'axios';

export async function getChatSchedule(tasks) {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing API key");

  const promptText = tasks
    .map((t,i) => `${i+1}. ${t.name} (due ${t.dueDate})`)
    .join("\n");

  const url =
    `https://generativelanguage.googleapis.com/v1beta2/models/chat-bison-001:generateMessage?key=${apiKey}`;

    const body = {
      prompt: {
        messages: [
          { content: promptText }
        ]
      }
    };
  const { data } = await axios.post(url, body, {
    headers: { "Content-Type": "application/json" }
  });

  return data.candidates?.[0]?.content ?? "No response";
}

