// src/utils/gemini.js
import axios from 'axios';

export async function getChatSchedule(tasks) {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('API key is missing. Please check your environment variables.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  // Generate the task list as a single string
  const taskDescriptions = tasks
    .map((t, i) => `${i + 1}. ${t.name} (due ${t.dueDate}, priority ${t.weight})`)
    .join('\n');

  // Construct the payload to match the API's expected structure
  const body = {
    contents: [
      {
        parts: [
          {
            text: `Generate a schedule for the following tasks:\n\n${taskDescriptions}`
          }
        ]
      }
    ]
  };

  try {
    const { data } = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Extract and return the text content
    const content = data.candidates?.[0]?.content;
    if (typeof content === 'string') {
      return content;
    } else if (content?.parts) {
      return content.parts.map(part => part.text).join(''); // Combine parts into a single string
    } else {
      return 'No valid response from AI.';
    }
  } catch (error) {
    console.error('Error in getChatSchedule:', error.response?.data || error.message);
    throw new Error('Failed to fetch schedule from AI API.');
  }
}

