import axios from 'axios';
import { getAISchedule } from './gemini.js';

jest.mock('axios');

describe('getAISchedule', () => {
    it('should return schedule', async () => {
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
});
