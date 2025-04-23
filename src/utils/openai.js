import axios from 'axios';

export async function getAISchedule(tasks) {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

  const prompt = `Generate a weekly study plan based on these tasks:\n${tasks.map(t =>
    `- ${t.name}, due ${t.dueDate}, worth ${t.weight}%`).join('\n')}
  `;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful scheduling assistant.' },
          { role: 'user', content: prompt }
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Something went wrong with AI scheduling.";
  }
}
