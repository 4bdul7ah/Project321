import { 
    shareTaskWithUser,
    trackTaskCompletion,
    setTaskReminder,
    getTaskAnalytics 
} from './taskUtils';

import { 
    collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, query, where, Timestamp 
} from 'firebase/firestore';

import { waitFor } from '@testing-library/react';

jest.mock('../firebase', () => ({
    db: {} // Provide a mock `db` object
  }));
  
jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    setDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    Timestamp: {
        fromDate: jest.fn(date => ({ seconds: Math.floor(date.getTime() / 1000) }))
    }
}));

const mockDb = {};

describe('taskUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('shareTaskWithUser', () => {
        it('should create a new user doc if recipient not found and share task', async () => {
            getDocs.mockResolvedValueOnce({ empty: true, docs: [] });
            setDoc.mockResolvedValueOnce();
            getDoc.mockResolvedValueOnce({ data: () => ({ email: 'sender@example.com' }) });
            addDoc.mockResolvedValueOnce({ id: 'newTaskId' });

            const task = {
                task: 'Test task',
                priority: 'High',
                category: 'Work',
                tags: ['urgent']
            };

            const result = await shareTaskWithUser(task, 'senderUid123', 'newuser@example.com');

            expect(setDoc).toHaveBeenCalled();
            expect(addDoc).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should prevent sharing a task with yourself', async () => {
            getDocs.mockResolvedValueOnce({
                empty: false,
                docs: [{ id: 'senderUid123', data: () => ({ email: 'sender@example.com' }) }]
            });

            const result = await shareTaskWithUser({ task: 'Test' }, 'senderUid123', 'sender@example.com');
            expect(result.success).toBe(false);
            expect(result.message).toMatch(/cannot share.*yourself/i);
        });
    });

    describe('trackTaskCompletion', () => {
        it('should update existing task stats', async () => {
            getDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({
                    daily: {},
                    monthly: {}
                })
            });

            updateDoc.mockResolvedValueOnce();

            const result = await trackTaskCompletion('user123', 'task456', true);
            expect(updateDoc).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should create new task stats doc if it doesn’t exist', async () => {
            getDoc.mockResolvedValueOnce({ exists: () => false });
            setDoc.mockResolvedValueOnce();

            const result = await trackTaskCompletion('user123', 'task456', true);
            expect(setDoc).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });
    });

    describe('setTaskReminder', () => {
        it('should update the task with reminder info', async () => {
            getDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ task: 'Reminder test' })
            });
            updateDoc.mockResolvedValueOnce();
            addDoc.mockResolvedValueOnce();

            const reminderTime = new Date();
            const result = await setTaskReminder('user123', 'task789', reminderTime);

            expect(updateDoc).toHaveBeenCalled();
            expect(addDoc).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should return error if task is not found', async () => {
            getDoc.mockResolvedValueOnce({ exists: () => false });

            const result = await setTaskReminder('user123', 'nonexistentTask', new Date());
            expect(result.success).toBe(false);
        });
    });

    describe('getTaskAnalytics', () => {
        it('should return analytics with task data and trend', async () => {
            getDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({
                    daily: {
                        '2025-5-1': { completed: 2 },
                        '2025-5-2': { completed: 3 }
                    }
                })
            });

            getDocs.mockResolvedValueOnce({
                empty: false,
                docs: [
                    {
                        id: 'task1',
                        data: () => ({
                            task: 'A',
                            completed: true,
                            timestamp: Timestamp.fromDate(new Date(Date.now() - 100000)),
                            category: 'Work',
                            priority: 'High'
                        })
                    },
                    {
                        id: 'task2',
                        data: () => ({
                            task: 'B',
                            completed: false,
                            timestamp: Timestamp.fromDate(new Date(Date.now() - 500000)),
                            category: 'Home',
                            priority: 'Low'
                        })
                    }
                ]
            });

            const result = await getTaskAnalytics('user123');
            expect(result.success).toBe(true);
            expect(result.data.total).toBe(2);
            expect(result.data.completed).toBe(1);
            expect(result.data.byCategory.Work.total).toBe(1);
            expect(result.data.priorityCounts.High).toBeDefined();
        });

        it('should return empty analytics if no tasks exist', async () => {
            getDoc.mockResolvedValueOnce({ exists: () => false });
            getDocs.mockResolvedValueOnce({ empty: true, docs: [] });

            const result = await getTaskAnalytics('user123');
            expect(result.success).toBe(true);
            expect(result.data.total).toBe(0);
        });
    });
    describe('shareTaskWithUser - edge cases and errors', () => {
        it('should handle invalid task object', async () => {
            const result = await shareTaskWithUser(null, 'senderUid123', 'someone@example.com');
            expect(result.success).toBe(false);
        });
    
        it('should handle dueDate as Firebase Timestamp', async () => {
            getDocs.mockResolvedValueOnce({ empty: true, docs: [] });
            setDoc.mockResolvedValueOnce();
            getDoc.mockResolvedValueOnce({ data: () => ({ email: 'sender@example.com' }) });
            addDoc.mockResolvedValueOnce({ id: 'newTaskId' });
    
            const mockTimestamp = { toDate: () => new Date() };
    
            const task = {
                task: 'Task with timestamp',
                dueDate: mockTimestamp,
                priority: 'Medium',
                category: 'Errands',
                tags: []
            };
    
            const result = await shareTaskWithUser(task, 'senderUid123', 'another@example.com');
            expect(result.success).toBe(true);
        });
    
        it('should handle dueDate as JS Date object', async () => {
            getDocs.mockResolvedValueOnce({ empty: true, docs: [] });
            setDoc.mockResolvedValueOnce();
            getDoc.mockResolvedValueOnce({ data: () => ({ email: 'sender@example.com' }) });
            addDoc.mockResolvedValueOnce({ id: 'newTaskId' });
    
            const task = {
                task: 'Task with Date',
                dueDate: new Date(),
                priority: 'Low',
                category: 'Health',
                tags: []
            };
    
            const result = await shareTaskWithUser(task, 'senderUid123', 'third@example.com');
            expect(result.success).toBe(true);
        });
    
        it('should handle dueDate as valid string', async () => {
            getDocs.mockResolvedValueOnce({ empty: true, docs: [] });
            setDoc.mockResolvedValueOnce();
            getDoc.mockResolvedValueOnce({ data: () => ({ email: 'sender@example.com' }) });
            addDoc.mockResolvedValueOnce({ id: 'newTaskId' });
    
            const task = {
                task: 'Task with string',
                dueDate: '2025-05-01T10:00:00Z',
                priority: 'High',
                category: 'Finance',
                tags: []
            };
    
            const result = await shareTaskWithUser(task, 'senderUid123', 'fourth@example.com');
            expect(result.success).toBe(true);
        });
    
        it('should handle error during addDoc in shareTaskWithUser', async () => {
            getDocs.mockResolvedValueOnce({ empty: true, docs: [] });
            setDoc.mockResolvedValueOnce();
            getDoc.mockResolvedValueOnce({ data: () => ({ email: 'sender@example.com' }) });
            addDoc.mockRejectedValueOnce(new Error('AddDoc failed'));
    
            const task = {
                task: 'Error Task',
                priority: 'High',
                category: 'Work',
                tags: []
            };
    
            const result = await shareTaskWithUser(task, 'senderUid123', 'fail@example.com');
            expect(result.success).toBe(false);
            expect(result.message).toMatch(/AddDoc failed/);
        });
    });
    
    describe('trackTaskCompletion - error path', () => {
        it('should handle error during updateDoc', async () => {
            getDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ daily: {}, monthly: {} })
            });
            updateDoc.mockRejectedValueOnce(new Error('Update failed'));
    
            const result = await trackTaskCompletion('userX', 'taskX', true);
            expect(result.success).toBe(false);
            expect(result.message).toMatch(/Update failed/);
        });
    
        it('should handle error during setDoc', async () => {
            getDoc.mockResolvedValueOnce({ exists: () => false });
            setDoc.mockRejectedValueOnce(new Error('Set failed'));
    
            const result = await trackTaskCompletion('userX', 'taskX', true);
            expect(result.success).toBe(false);
            expect(result.message).toMatch(/Set failed/);
        });
    });
    
    describe('setTaskReminder - error path', () => {
        it('should handle error during updateDoc', async () => {
            getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });
            updateDoc.mockRejectedValueOnce(new Error('Reminder update failed'));
    
            const result = await setTaskReminder('userX', 'taskY', new Date());
            expect(result.success).toBe(false);
            expect(result.message).toMatch(/Reminder update failed/);
        });
    });
    
    describe('getTaskAnalytics - error path', () => {
        it('should handle error during getDoc', async () => {
            getDoc.mockRejectedValueOnce(new Error('getDoc failed'));
    
            const result = await getTaskAnalytics('userX');
            expect(result.success).toBe(false);
            expect(result.message).toMatch(/getDoc failed/);
        });
    
        it('should handle error during getDocs', async () => {
            getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });
            getDocs.mockRejectedValueOnce(new Error('getDocs failed'));
    
            const result = await getTaskAnalytics('userX');
            expect(result.success).toBe(false);
            expect(result.message).toMatch(/getDocs failed/);
        });
    });
    test('returns error and logs console.error for invalid task object', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
        // Mock Firestore responses
        getDocs.mockResolvedValueOnce({
          empty: false,
          docs: [{ id: 'recipient123', data: () => ({ email: 'recipient@example.com' }) }]
        });
        getDoc.mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ email: 'sender@example.com' })
        });
      
        // Test with null task
        const result1 = await shareTaskWithUser(null, 'sender123', 'recipient@example.com');
        expect(result1.success).toBe(false);
        expect(result1.message).toMatch(/Invalid task data|Missing required fields/);
        expect(consoleSpy).toHaveBeenCalledWith('Invalid task object', null);
      
        // Test with invalid task object
        const result2 = await shareTaskWithUser({}, 'sender123', 'recipient@example.com');
        expect(result2.success).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Invalid task object', null);
      
        consoleSpy.mockRestore();
      });
       
});
