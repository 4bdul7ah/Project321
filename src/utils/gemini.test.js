import axios from 'axios';
import { getAISchedule } from './gemini.js';

jest.mock('axios');

describe('getAISchedule', () => {
    it('should return schedule when API responds successfully', async () => {
        axios.post.mockResolvedValue({
            data: {
                candidates: [
                    {
                        content: {
                            parts: [{ text: 'Mocked schedule output' }]
                        }
                    }
                ]
            }
        });

        const tasks = [{ name: 'Math HW', dueDate: '2025-05-10', weight: 20 }];
        const result = await getAISchedule(tasks);
        expect(result).toBe('Mocked schedule output');
    });

    it('should return "No valid response from AI." if candidates array is empty', async () => {
        axios.post.mockResolvedValue({
            data: {
                candidates: []
            }
        });

        const tasks = [{ name: 'Math HW', dueDate: '2025-05-10', weight: 20 }];
        const result = await getAISchedule(tasks);
        expect(result).toBe('No valid response from AI.');
    });

    it('should return "No valid response from AI." if response data is malformed', async () => {
        axios.post.mockResolvedValue({
            data: {}
        });

        const tasks = [{ name: 'Math HW', dueDate: '2025-05-10', weight: 20 }];
        const result = await getAISchedule(tasks);
        expect(result).toBe('No valid response from AI.');
    });

    it('should throw an error if API key is missing', async () => {
        process.env.REACT_APP_GEMINI_API_KEY = undefined;

        const tasks = [{ name: 'Math HW', dueDate: '2025-05-10', weight: 20 }];
        await expect(getAISchedule(tasks)).rejects.toThrow(
            'API key is missing. Please check your environment variables.'
        );
    });

    it('should throw an error if API request fails', async () => {
        axios.post.mockRejectedValue(new Error('Network Error'));

        const tasks = [{ name: 'Math HW', dueDate: '2025-05-10', weight: 20 }];
        await expect(getAISchedule(tasks)).rejects.toThrow(
            'Failed to fetch schedule from AI API.'
        );
    });
});