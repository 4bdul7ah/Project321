import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    doc, 
    getDoc, 
    updateDoc, 
    arrayUnion, 
    Timestamp,
    setDoc
} from 'firebase/firestore';
import { db } from '../firebase';

// Share a task with another user via their email
export const shareTaskWithUser = async (task, senderUid, recipientEmail) => {
    try {
        console.log(`Sharing task from ${senderUid} to ${recipientEmail}`);
        
        // First, look up the user by email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', recipientEmail));
        const querySnapshot = await getDocs(q);
        
        let recipientUid;
        
        if (querySnapshot.empty) {
            console.log('No user found with that email, creating a new user document');
            
            // Create a safe document ID from the email
            const safeId = recipientEmail.replace(/[.@]/g, '_');
            
            // Create a new user document
            await setDoc(doc(db, 'users', safeId), {
                email: recipientEmail,
                createdAt: new Date(),
                tempAccount: true
            });
            
            recipientUid = safeId;
            console.log(`Created new user document with ID: ${recipientUid}`);
        } else {
            // Get recipient user info from the existing document
            const recipientDoc = querySnapshot.docs[0];
            recipientUid = recipientDoc.id;
            console.log(`Found existing user with ID: ${recipientUid}`);
        }
        
        if (recipientUid === senderUid) {
            return { 
                success: false, 
                message: 'You cannot share a task with yourself.' 
            };
        }
        
        console.log(`Preparing to share task with user ID: ${recipientUid}`);
        
        // Get sender information
        const senderDoc = await getDoc(doc(db, 'users', senderUid));
        const senderEmail = senderDoc.data().email || 'Unknown user';
        
        // Clone the task with shared properties
        // First, ensure the task object has all required fields
        if (!task || !task.task) {
            console.error('Invalid task object', task);
            return { 
                success: false, 
                message: 'Invalid task data: Missing required fields' 
            };
        }
        
        // Convert any invalid values to appropriate defaults
        const sharedTaskData = {
            task: task.task || 'Untitled Task',
            priority: task.priority || 'Medium',
            dueDate: null, // Set to null by default
            category: task.category || 'General',
            tags: Array.isArray(task.tags) ? task.tags : [],
            timestamp: new Date(),
            completed: false,
            archived: false,
            isShared: true,
            sharedBy: senderEmail,
            originalOwnerId: senderUid,
            sharedAt: new Date(),
            shareStatus: 'pending'
        };
        
        // Only set dueDate if it's valid
        if (task.dueDate) {
            try {
                // Check if it's a Firebase timestamp
                if (task.dueDate.toDate) {
                    sharedTaskData.dueDate = task.dueDate;
                } 
                // Check if it's a Date object
                else if (task.dueDate instanceof Date) {
                    sharedTaskData.dueDate = task.dueDate;
                }
                // Check if it's a valid date string
                else if (typeof task.dueDate === 'string' && !isNaN(new Date(task.dueDate).getTime())) {
                    sharedTaskData.dueDate = new Date(task.dueDate);
                }
            } catch (error) {
                console.error('Error parsing dueDate:', error);
                // Keep dueDate as null
            }
        }
        
        console.log(`Preparing to share task data:`, sharedTaskData);
        
        // Add to the recipient's incomingSharedTasks collection
        try {
            // Create the collection if it doesn't exist
            const incomingTasksRef = collection(db, `users/${recipientUid}/incomingSharedTasks`);
            const newTaskRef = await addDoc(incomingTasksRef, sharedTaskData);
            console.log(`Successfully added task to recipient's inbox with ID: ${newTaskRef.id}`);
        } catch (error) {
            console.error('Error adding to incomingSharedTasks:', error);
            throw error; // Rethrow to be caught by outer try/catch
        }
        
        console.log(`Task shared successfully to ${recipientEmail}'s inbox`);
        
        return { 
            success: true, 
            message: `Task shared with ${recipientEmail}. They will see it in their inbox.` 
        };
    } catch (error) {
        console.error('Error sharing task:', error);
        return { 
            success: false, 
            message: `Error sharing task: ${error.message}` 
        };
    }
};

// Track task completions for analytics
export const trackTaskCompletion = async (userId, taskId, isCompleted) => {
    try {
        // Get a reference to the taskStats document
        const statsRef = doc(db, 'users', userId, 'stats', 'taskStats');
        
        // Try to get the existing document
        const statsDoc = await getDoc(statsRef);
        
        const now = new Date();
        const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
        
        if (statsDoc.exists()) {
            // Update existing stats document
            const statsData = statsDoc.data();
            
            // Daily stats
            const dailyStats = statsData.daily || {};
            dailyStats[dayKey] = dailyStats[dayKey] || { completed: 0, total: 0 };
            if (isCompleted) {
                dailyStats[dayKey].completed += 1;
            }
            
            // Monthly stats
            const monthlyStats = statsData.monthly || {};
            monthlyStats[monthKey] = monthlyStats[monthKey] || { completed: 0, total: 0 };
            if (isCompleted) {
                monthlyStats[monthKey].completed += 1;
            }
            
            // Update the document
            await updateDoc(statsRef, {
                daily: dailyStats,
                monthly: monthlyStats,
                lastUpdated: now
            });
        } else {
            // Create new stats document with a specific ID
            const dailyStats = {};
            dailyStats[dayKey] = { completed: isCompleted ? 1 : 0, total: 1 };
            
            const monthlyStats = {};
            monthlyStats[monthKey] = { completed: isCompleted ? 1 : 0, total: 1 };
            
            // Use setDoc with a specific document ID instead of addDoc
            await setDoc(statsRef, {
                docType: 'taskStats',
                daily: dailyStats,
                monthly: monthlyStats,
                created: now,
                lastUpdated: now
            });
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error tracking task stats:', error);
        return { success: false, message: error.message };
    }
};

// Set reminders for upcoming tasks
export const setTaskReminder = async (userId, taskId, reminderTime) => {
    try {
        // Get the task
        const taskRef = doc(db, 'users', userId, 'tasks', taskId);
        const taskDoc = await getDoc(taskRef);
        
        if (!taskDoc.exists()) {
            return { success: false, message: 'Task not found' };
        }
        
        // Update the task with reminder information
        await updateDoc(taskRef, {
            reminder: {
                time: Timestamp.fromDate(reminderTime),
                isActive: true,
                createdAt: new Date()
            }
        });
        
        // Add to reminders collection for background processing
        const remindersRef = collection(db, 'reminders');
        await addDoc(remindersRef, {
            userId: userId,
            taskId: taskId,
            taskTitle: taskDoc.data().task,
            reminderTime: Timestamp.fromDate(reminderTime),
            isProcessed: false,
            createdAt: new Date()
        });
        
        return { success: true, message: 'Reminder set successfully' };
    } catch (error) {
        console.error('Error setting reminder:', error);
        return { success: false, message: error.message };
    }
};

// Get task analytics
export const getTaskAnalytics = async (userId) => {
    try {
        // First, get persisted analytics from the stats collection
        const statsRef = doc(db, 'users', userId, 'stats', 'taskStats');
        const statsDoc = await getDoc(statsRef);
        
        // Initialize with default data
        let analyticsData = {
            total: 0,
            completed: 0,
            overdue: 0,
            byCategory: {},
            priorityCounts: {},
            productivityTrend: []
        };
        
        // Get all tasks for the user
        const tasksRef = collection(db, 'users', userId, 'tasks');
        const querySnapshot = await getDocs(tasksRef);
        
        if (!querySnapshot.empty) {
            const tasks = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate?.() ?? null,
            }));
            
            // Calculate current stats
            const now = new Date();
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(task => task.completed).length;
            const overdueTasks = tasks.filter(task => !task.completed && task.timestamp && task.timestamp < now).length;
            
            // Count by category
            const categoryCounts = {};
            tasks.forEach(task => {
                const category = task.category || 'uncategorized';
                if (!categoryCounts[category]) {
                    categoryCounts[category] = { total: 0, completed: 0 };
                }
                categoryCounts[category].total += 1;
                if (task.completed) {
                    categoryCounts[category].completed += 1;
                }
            });
            
            // Count by priority
            const priorityCounts = {};
            tasks.forEach(task => {
                const priority = task.priority || 3;
                priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
            });
            
            analyticsData = {
                ...analyticsData,
                total: totalTasks,
                completed: completedTasks,
                overdue: overdueTasks,
                byCategory: categoryCounts,
                priorityCounts
            };
        }
        
        // If we have persisted stats, use them for the trends
        if (statsDoc.exists()) {
            const statsData = statsDoc.data();
            const dailyStats = statsData.daily || {};
            
            // Create a 7-day productivity trend
            const trend = [];
            const today = new Date();
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                
                trend.push({
                    date: date.toISOString().split('T')[0],
                    completed: dailyStats[key]?.completed || 0
                });
            }
            
            analyticsData.productivityTrend = trend;
        } else {
            // Create an empty 7-day trend
            const trend = [];
            const today = new Date();
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                
                trend.push({
                    date: date.toISOString().split('T')[0],
                    completed: 0
                });
            }
            
            analyticsData.productivityTrend = trend;
        }
        
        return { success: true, data: analyticsData };
    } catch (error) {
        console.error('Error getting task analytics:', error);
        return { 
            success: false, 
            message: error.message,
            data: {
                total: 0,
                completed: 0,
                overdue: 0,
                byCategory: {},
                priorityCounts: {},
                productivityTrend: []
            }
        };
    }
}; 