import axios from 'axios';

export async function getAISchedule(tasks) {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  const prompt = `Make a weekly study schedule using these tasks:\n` + tasks.map(t =>
    `- ${t.name}, due on ${t.dueDate}, worth ${t.weight}%`
  ).join('\n');

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    } else {
      console.error("No valid response from Gemini.");
      return "Couldn't generate a schedule.";
    }
  } catch (err) {
    console.error("Gemini API Error:", err.message);
    return "Error generating schedule.";
  }
}
