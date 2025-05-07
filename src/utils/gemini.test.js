// src/utils/gemini.test.js
import axios from 'axios';
import { getChatSchedule } from './gemini.js';

jest.mock('axios');

describe('getChatSchedule', () => {
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
        const result = await getChatSchedule(tasks);
        expect(result).toBe('Mocked schedule output');
    });
    it('should return content when content is a plain string', async () => {
        axios.post.mockResolvedValue({
            data: {
                candidates: [
                    {
                        content: 'Here is your schedule for today.'
                    }
                ]
            }
        });

        const tasks = [{ name: 'English Essay', dueDate: '2025-05-11', weight: 15 }];
        const result = await getChatSchedule(tasks);
        expect(result).toBe('Here is your schedule for today.');
    });
    it('should return "No valid response from AI." if candidates array is empty', async () => {
        axios.post.mockResolvedValue({
            data: {
                candidates: []
            }
        });
        
        const tasks = [{ name: 'Math HW', dueDate: '2025-05-10', weight: 20 }];
        const result = await getChatSchedule(tasks);
        expect(result).toBe('No valid response from AI.');
    });
    
    it('should return "No valid response from AI." if response data is malformed', async () => {
        axios.post.mockResolvedValue({
            data: {}
        });
        
        const tasks = [{ name: 'Math HW', dueDate: '2025-05-10', weight: 20 }];
        const result = await getChatSchedule(tasks);
        expect(result).toBe('No valid response from AI.');
    });
    it('should throw an error if API request fails', async () => {
        axios.post.mockRejectedValue(new Error('Network Error'));
        
        const tasks = [{ name: 'Math HW', dueDate: '2025-05-10', weight: 20 }];
        await expect(getChatSchedule(tasks)).rejects.toThrow(
            'Failed to fetch schedule from AI API.'
        );
    });
    it('should throw an error if API key is missing', async () => {
        jest.resetModules(); // Reset module cache so the env var change takes effect
        delete process.env.REACT_APP_GEMINI_API_KEY;
    
        // Import AFTER resetting modules and deleting env var
        const { getChatSchedule } = await import('./gemini.js');
    
        const tasks = [{ name: 'Math HW', dueDate: '2025-05-10', weight: 20 }];
        await expect(getChatSchedule(tasks)).rejects.toThrow(
            'API key is missing. Please check your environment variables.'
        );
    });
    
});