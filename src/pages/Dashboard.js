import React, { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc, query, where, writeBatch, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { motion } from 'framer-motion';
import '../styles/Dashboard.css';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { shareTaskWithUser, getTaskAnalytics, trackTaskCompletion } from '../utils/taskUtils';
import { getChatSchedule } from '../utils/gemini';



const localizer = momentLocalizer(moment);

const Dashboard = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedTag, setSelectedTag] = useState('');
    const [uniqueTags, setUniqueTags] = useState([]);
    const [showStats, setShowStats] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        overdue: 0,
        byCategory: {},
        productivityTrend: []
    });
    const [sharingTask, setSharingTask] = useState(null);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [shareMessage, setShareMessage] = useState({ type: '', message: '' });
    const [pendingSharedTasks, setPendingSharedTasks] = useState([]);
    const [showInbox, setShowInbox] = useState(false);
    const [archivedTasks, setArchivedTasks] = useState([]);
    const [showArchived, setShowArchived] = useState(false);
    const [aiSchedule, setAiSchedule] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAiScheduleVisible, setIsAiScheduleVisible] = useState(true);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
                fetchTasks(user.uid);
                migrateTasks(user.uid);
                fetchCategories(user.uid);
            } else {
                navigate('/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate]);
    
    useEffect(() => {
        // Apply filters when tasks, selectedCategory, or selectedTag changes
        applyFilters();
        updateStats();
    }, [tasks, selectedCategory, selectedTag]);

    useEffect(() => {
        if (currentUser) {
            fetchDetailedAnalytics();
        }
    }, [tasks]);
    
    useEffect(() => {
        if (currentUser) {
            fetchIncomingSharedTasks();
        }
    }, [currentUser]);

    useEffect(() => {
        if (showArchived && currentUser) {
            fetchArchivedTasks();
        }
    }, [showArchived, currentUser]);

    const fetchCategories = async (userId) => {
        try {
            const categoriesCollection = collection(db, 'users', userId, 'categories');
            const querySnapshot = await getDocs(categoriesCollection);
            
            const categoriesList = querySnapshot.docs.map(doc => doc.data().name);
            setCategories(['all', ...categoriesList]);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const migrateTasks = async (userId) => {
        try {
            const oldTasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
            const querySnapshot = await getDocs(oldTasksQuery);

            const batch = writeBatch(db);
            let count = 0;

            for (const document of querySnapshot.docs) {
                const data = document.data();
                const userTasksCollection = collection(db, 'users', userId, 'tasks');
                await addDoc(userTasksCollection, {
                    task: data.task,
                    priority: data.priority,
                    timestamp: data.timestamp,
                    category: 'work', // Default category for migrated tasks
                    tags: [],         // Default empty tags for migrated tasks
                    completed: false, // Default to not completed
                    created: new Date()
                });

                const oldDocRef = doc(db, 'tasks', document.id);
                batch.delete(oldDocRef);
                count++;
            }

            if (count > 0) {
                await batch.commit();
                console.log(`Migrated ${count} tasks to new structure for user ${userId}`);
                fetchTasks(userId);
            }
        } catch (error) {
            console.error('Error migrating tasks:', error);
        }
    };

    const fetchTasks = async (userId) => {
        try {
            console.log("Fetching tasks for user:", userId);
            const tasksCollection = collection(db, `users/${userId}/tasks`);
            
            // Modified query to handle null/undefined archived fields
            // This won't filter out tasks where archived field doesn't exist
            let querySnapshot;
            try {
                // First try to get all tasks
                querySnapshot = await getDocs(tasksCollection);
                console.log(`Found ${querySnapshot.docs.length} total tasks`);
                
                // Filter in JavaScript instead of Firestore query
                const allTasks = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data
                    };
                });
                
                // Filter out archived tasks client-side
                const activeTasks = allTasks.filter(task => !task.archived);
                console.log(`After filtering: ${activeTasks.length} active tasks`);
                
                // Process the tasks as before
                const fetchedTasks = activeTasks.map(task => {
                    // Handle different timestamp formats
                    let formattedTimestamp = task.timestamp;
                    if (task.timestamp && typeof task.timestamp.toDate === 'function') {
                        formattedTimestamp = task.timestamp.toDate();
                    } else if (task.timestamp && task.timestamp.seconds) {
                        // Handle Firebase Timestamp object format
                        formattedTimestamp = new Date(task.timestamp.seconds * 1000);
                    }
                    
                    return {
                        id: task.id,
                        ...task,
                        timestamp: formattedTimestamp,
                        // Handle case when completedAt might be a Firebase timestamp
                        completedAt: task.completedAt && typeof task.completedAt.toDate === 'function' 
                            ? task.completedAt.toDate() 
                            : task.completedAt
                    };
                });
                
                // Sort tasks by priority (high to low)
                fetchedTasks.sort((a, b) => b.priority - a.priority);
                
                console.log("Processed tasks:", fetchedTasks);
                
                setTasks(fetchedTasks);
                
                // Extract unique tags from all tasks
                const allTags = fetchedTasks.flatMap(task => task.tags || []);
                const uniqueTagsSet = new Set(allTags);
                setUniqueTags(Array.from(uniqueTagsSet));
                
                return fetchedTasks;
                
            } catch (error) {
                console.error("Error with query, trying simpler approach:", error);
                // Fallback to getting all tasks if the query fails
                querySnapshot = await getDocs(tasksCollection);
                
                const fetchedTasks = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    console.log("Task data:", doc.id, data);
                    
                    // Handle different timestamp formats
                    let formattedTimestamp = data.timestamp;
                    if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                        formattedTimestamp = data.timestamp.toDate();
                    } else if (data.timestamp && data.timestamp.seconds) {
                        // Handle Firebase Timestamp object format
                        formattedTimestamp = new Date(data.timestamp.seconds * 1000);
                    }
                    
                    return {
                        id: doc.id,
                        ...data,
                        timestamp: formattedTimestamp
                    };
                });
                
                setTasks(fetchedTasks);
                return fetchedTasks;
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }
    };
    
    const applyFilters = () => {
        let filtered = [...tasks];
        
        // Filter by category if not 'all'
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(task => task.category === selectedCategory);
        }
        
        // Filter by tag if selected
        if (selectedTag) {
            filtered = filtered.filter(task => task.tags && task.tags.includes(selectedTag));
        }
        
        setFilteredTasks(filtered);
    };
    
    const updateStats = () => {
        const now = new Date();
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const overdueTasks = tasks.filter(task => 
            !task.completed && task.timestamp && task.timestamp < now
        ).length;
        
        // Count tasks by category
        const categoryStats = {};
        tasks.forEach(task => {
            const cat = task.category || 'uncategorized';
            if (!categoryStats[cat]) {
                categoryStats[cat] = { total: 0, completed: 0 };
            }
            categoryStats[cat].total += 1;
            if (task.completed) {
                categoryStats[cat].completed += 1;
            }
        });
        
        setStats({
            total: totalTasks,
            completed: completedTasks,
            overdue: overdueTasks,
            byCategory: categoryStats
        });
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'tasks', id));
            setTasks(tasks.filter(task => task.id !== id));
        } catch (error) {
            console.error('Error deleting task:', error.message);
        }
    };
    
    const handleToggleComplete = async (id, currentStatus) => {
        try {
            const taskRef = doc(db, 'users', currentUser.uid, 'tasks', id);
            const newStatus = !currentStatus;
            
            // If task is being marked as complete, also archive it
            const updates = {
                completed: newStatus,
                completedAt: newStatus ? new Date() : null
            };
            
            if (newStatus) {
                // If completing the task, also archive it
                updates.archived = true;
            }
            
            await updateDoc(taskRef, updates);
            
            // Track completion for analytics
            const result = await trackTaskCompletion(currentUser.uid, id, newStatus);
            if (!result.success) {
                console.error("Error tracking task completion:", result.message);
            } else {
                // Refresh analytics after successful tracking
                fetchDetailedAnalytics();
            }
            
            // Update local state
            setTasks(tasks.map(task => 
                task.id === id 
                    ? {...task, 
                       completed: newStatus, 
                       completedAt: newStatus ? new Date() : null,
                       archived: newStatus ? true : task.archived
                      } 
                    : task
            ));
            
            // If task was completed and therefore archived, remove it from the filteredTasks
            if (newStatus) {
                setFilteredTasks(prevFiltered => prevFiltered.filter(task => task.id !== id));
            }
        } catch (error) {
            console.error('Error updating task completion status:', error);
        }
    };

    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error.message);
        }
    };

    const cancelLogout = () => {
        setShowLogoutConfirm(false);
    };

    // Function to handle sharing a task
    const handleShareTask = async () => {
        console.log("Sharing with email:", recipientEmail);
        
        if (!sharingTask || !recipientEmail) {
            setShareMessage({ type: 'error', message: 'Please select a task and enter an email' });
            return;
        }
        
        setShareMessage({ type: 'info', message: 'Sharing task...' });
        
        try {
            console.log(`Attempting to share task ${sharingTask.id} from user ${currentUser.uid} with ${recipientEmail}`);
            
            // Make sure we have the current user
            if (!currentUser || !currentUser.uid) {
                setShareMessage({ type: 'error', message: 'User authentication required. Please log in again.' });
                return;
            }
            
            const result = await shareTaskWithUser(sharingTask, currentUser.uid, recipientEmail);
            console.log("Share result:", result);
            
            if (result.success) {
                setShareMessage({ type: 'success', message: result.message });
                setRecipientEmail('');
                setSharingTask(null);
                
                // Close modal after success (optional)
                setTimeout(() => {
                    closeShareDialog();
                }, 2000);
            } else {
                setShareMessage({ type: 'error', message: result.message });
            }
        } catch (err) {
            console.error('Error in handleShareTask:', err);
            setShareMessage({ 
                type: 'error', 
                message: `Sharing failed: ${err.message || 'Unknown error'}`
            });
        }
    };

    // Function to close the share dialog
    const closeShareDialog = () => {
        setSharingTask(null);
        setRecipientEmail('');
        setShareMessage({ type: '', message: '' });
    };

    const fetchDetailedAnalytics = async () => {
        if (!currentUser) return;
        
        try {
            console.log("Fetching analytics for user:", currentUser.uid);
            const result = await getTaskAnalytics(currentUser.uid);
            
            if (result.success) {
                console.log("Analytics data:", result.data);
                // Update stats state with detailed analytics
                setStats(result.data);
            } else {
                console.error("Error fetching analytics:", result.message);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    };

    const fetchIncomingSharedTasks = async () => {
        if (!currentUser) return;
        
        try {
            console.log("Fetching incoming shared tasks for user:", currentUser.uid);
            // Get tasks from the incomingSharedTasks collection
            const incomingTasksCollection = collection(db, `users/${currentUser.uid}/incomingSharedTasks`);
            const querySnapshot = await getDocs(incomingTasksCollection);
            
            console.log(`Found ${querySnapshot.docs.length} incoming shared tasks`);
            
            const incomingTasks = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
            }));
            
            setPendingSharedTasks(incomingTasks);
        } catch (error) {
            console.error('Error fetching incoming shared tasks:', error);
        }
    };

    const acceptSharedTask = async (taskId) => {
        try {
            // 1. Get the task data from incomingSharedTasks
            const taskRef = doc(db, 'users', currentUser.uid, 'incomingSharedTasks', taskId);
            const taskDoc = await getDoc(taskRef);
            
            if (!taskDoc.exists()) {
                console.error('Shared task not found');
                return;
            }
            
            const taskData = taskDoc.data();
            
            // 2. Add the task to the user's tasks collection
            const tasksCollection = collection(db, 'users', currentUser.uid, 'tasks');
            await addDoc(tasksCollection, {
                ...taskData,
                shareStatus: 'accepted',
                acceptedAt: new Date()
            });
            
            // 3. Delete the task from incomingSharedTasks
            await deleteDoc(taskRef);
            
            // 4. Update local state
            setPendingSharedTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
            
            // 5. Refresh tasks to include the newly accepted task
            fetchTasks(currentUser.uid);
        } catch (error) {
            console.error('Error accepting shared task:', error);
        }
    };

    const declineSharedTask = async (taskId) => {
        try {
            // Simply delete the task from incomingSharedTasks
            const taskRef = doc(db, 'users', currentUser.uid, 'incomingSharedTasks', taskId);
            await deleteDoc(taskRef);
            
            // Update local state
            setPendingSharedTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
        } catch (error) {
            console.error('Error declining shared task:', error);
        }
    };

    const fetchArchivedTasks = async () => {
        if (!currentUser) return;
        
        try {
            console.log("Fetching archived tasks for user:", currentUser.uid);
            const tasksCollection = collection(db, `users/${currentUser.uid}/tasks`);
            const q = query(tasksCollection, where('archived', '==', true));
            const querySnapshot = await getDocs(q);
            
            console.log(`Found ${querySnapshot.docs.length} archived tasks`);
            
            const archived = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
            }));
            
            setArchivedTasks(archived);
        } catch (error) {
            console.error('Error fetching archived tasks:', error);
        }
    };

    const unarchiveTask = async (taskId) => {
        try {
            const taskRef = doc(db, 'users', currentUser.uid, 'tasks', taskId);
            await updateDoc(taskRef, { 
                archived: false,
                completed: false
            });
            
            // Remove from archived tasks
            setArchivedTasks(prevArchived => prevArchived.filter(task => task.id !== taskId));
            
            // Refresh tasks
            fetchTasks(currentUser.uid);
        } catch (error) {
            console.error('Error unarchiving task:', error);
        }
    };
      // ───────────────────────────────────────────────────────────────
  // 1) Function to call your Gemini helper and set state
  const handleGenerateAISchedule = async () => {
    if (!tasks.length) {
        setAiSchedule('No tasks available to generate a schedule.');
        setIsGenerating(false);
        return;
    }

    setIsGenerating(true);

    // prepare the payload for the API
    const payload = tasks.map(t => ({
        name: t.task,
        dueDate: t.timestamp instanceof Date
            ? t.timestamp.toISOString().split('T')[0]
            : new Date(t.timestamp).toISOString().split('T')[0],
        weight: t.priority || 1 // Default weight if priority is missing
    }));

    try {
        console.log('Sending payload to AI API:', payload); // Debugging log
        const scheduleText = await getChatSchedule(payload);
        setAiSchedule(scheduleText || 'No schedule generated.');
    } 
    catch (err) {
        console.error('Failed to generate AI schedule:', err);
        setAiSchedule('Error generating schedule. Please try again later.');
    } 
    finally {
        setIsGenerating(false);
    }

   };
   // ───────────────────────────────────────────────────────────────
 
   // 2) Re-run the AI call any time your tasks list changes:
   useEffect(() => {
     handleGenerateAISchedule();
   }, [tasks]);
    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <motion.div
            className="dashboard-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h2>🎉 Welcome to Your Dashboard!</h2>
                    <p>You're logged in and ready to go! 💼</p>
                </div>

                <div className="main-content">
                    <div className="dashboard-actions">
                        <Link to="/add-task" className="add-task-button">
                            ➕ Add New Task
                        </Link>
                        <button 
                            className="stats-button"
                            onClick={() => setShowStats(!showStats)}
                        >
                            📊 {showStats ? 'Hide' : 'Show'} Stats
                        </button>
                        <button 
                            className={`inbox-button ${pendingSharedTasks.length > 0 ? 'has-notifications' : ''}`}
                            onClick={() => setShowInbox(!showInbox)}
                        >
                            📬 Inbox {pendingSharedTasks.length > 0 && <span className="notification-badge">{pendingSharedTasks.length}</span>}
                        </button>
                        <button
                          className="ai-schedule-button"
                          onClick={handleGenerateAISchedule}
                          disabled={isGenerating}
                        >
                          {isGenerating ? 'Generating…' : '🤖 AI Schedule'}
                        </button>

                        {aiSchedule && (
                            <div className="ai-schedule-output">
                                <div className="ai-schedule-header">
                                    <h3>My AI-Generated Schedule</h3>
                                    <button 
                                        className="minimize-button" 
                                        onClick={() => setIsAiScheduleVisible(!isAiScheduleVisible)}
                                    >
                                        {isAiScheduleVisible ? 'Minimize' : 'Expand'}
                                    </button>
                                </div>
                                {isAiScheduleVisible && (
                                    <pre>{aiSchedule}</pre>
                                )}
                            </div>
                        )}
                        
                    </div>
                    
                    {showStats && (
                        <div className="stats-container">
                            <h3>Task Statistics</h3>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h4>Total Tasks</h4>
                                    <p className="stat-number">{stats.total}</p>
                                </div>
                                <div className="stat-card">
                                    <h4>Completed</h4>
                                    <p className="stat-number">{stats.completed}</p>
                                    <p className="stat-percent">
                                        {stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
                                    </p>
                                </div>
                                <div className="stat-card">
                                    <h4>Overdue</h4>
                                    <p className="stat-number">{stats.overdue}</p>
                                </div>
                            </div>
                            
                            {/* Productivity Trend */}
                            <h4>Productivity Trend (Last 7 Days)</h4>
                            <div className="productivity-trend">
                                {stats.productivityTrend?.map((day, index) => (
                                    <div key={index} className="trend-day">
                                        <div 
                                            className="trend-bar" 
                                            style={{ 
                                                height: `${Math.min(day.completed * 15, 100)}px`,
                                                backgroundColor: day.completed > 0 ? '#4caf50' : '#e0e0e0' 
                                            }}
                                        >
                                            <span className="trend-value">{day.completed}</span>
                                        </div>
                                        <div className="trend-date">
                                            {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Priority Distribution */}
                            {stats.priorityCounts && (
                                <>
                                    <h4>Priority Distribution</h4>
                                    <div className="priority-distribution">
                                        {[1, 2, 3, 4, 5].map(priority => (
                                            <div key={priority} className="priority-item">
                                                <div className="priority-label">
                                                    {Array(priority).fill('⭐').join('')}
                                                </div>
                                                <div className="priority-count">
                                                    {stats.priorityCounts[priority] || 0} tasks
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            
                            <h4>By Category</h4>
                            <div className="category-stats">
                                {Object.entries(stats.byCategory).map(([category, data]) => (
                                    <div key={category} className="category-stat-item">
                                        <span className="category-name">{category}</span>
                                        <div className="category-progress">
                                            <div 
                                                className="progress-bar"
                                                style={{
                                                    width: `${data.total ? (data.completed / data.total) * 100 : 0}%`
                                                }}
                                            ></div>
                                        </div>
                                        <span className="category-count">
                                            {data.completed}/{data.total}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="filters-section">
                        <div className="filter-group">
                            <label>Category:</label>
                            <select 
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="filter-select"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="filter-group">
                            <label>Tag:</label>
                            <select
                                value={selectedTag}
                                onChange={(e) => setSelectedTag(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All Tags</option>
                                {uniqueTags.map(tag => (
                                    <option key={tag} value={tag}>{tag}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="dashboard-main">
                        {!showArchived ? (
                            <div className="tasks-section">
                                <h3>Your Tasks</h3>
                                {filteredTasks.length > 0 ? (
                                    <ul className="task-list">
                                        {filteredTasks.map(task => (
                                            <motion.li 
                                                key={task.id}
                                                className={`task-item ${task.completed ? 'completed' : ''} ${task.isShared ? 'shared-task' : ''}`}
                                                whileHover={{ x: 5 }}
                                            >
                                                <div className="task-checkbox">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={task.completed} 
                                                        onChange={() => handleToggleComplete(task.id, task.completed)}
                                                    />
                                                </div>
                                                <div className="task-info">
                                                    <div className="task-header">
                                                        <strong>{task.task}</strong>
                                                        {task.isShared && (
                                                            <span className="shared-badge">Shared with you</span>
                                                        )}
                                                        {task.sharedBy && (
                                                            <span className="shared-by">From: {task.sharedBy}</span>
                                                        )}
                                                    </div>
                                                    <div className="task-meta">
                                                        <span className="task-priority">Priority: {task.priority}</span>
                                                        <span className="task-category">{task.category}</span>
                                                    </div>
                                                    
                                                    {task.tags && task.tags.length > 0 && (
                                                        <div className="task-tags">
                                                            {task.tags.map(tag => (
                                                                <span key={tag} className="tag">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    {task.timestamp && (
                                                        <div className="task-date">
                                                             {task.timestamp && typeof task.timestamp.toDate === 'function' 
                                                                ? task.timestamp.toDate().toLocaleDateString() 
                                                                : new Date(task.timestamp).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="task-actions">
                                                    {!task.isShared && (
                                                        <button
                                                            onClick={() => setSharingTask(task)}
                                                            className="share-button"
                                                        >
                                                            📤 Share
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(task.id)}
                                                        className="delete-button"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </motion.li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="empty-state">No tasks matching your filters. Add your first task!</p>
                                )}
                            </div>
                        ) : (
                            <div className="archived-container">
                                <h3>Archived Tasks</h3>
                                {archivedTasks.length === 0 ? (
                                    <p className="empty-archive">No archived tasks</p>
                                ) : (
                                    <ul className="archived-list">
                                        {archivedTasks.map(task => (
                                            <li key={task.id} className="archived-item">
                                                <div className="archived-task-info">
                                                    <strong>{task.task}</strong>
                                                    <div className="archived-task-meta">
                                                        <span className="archived-task-priority">Priority: {task.priority}</span>
                                                        <span className="archived-task-category">{task.category || 'No Category'}</span>
                                                        {task.completedAt && (
                                                            <span className="archived-task-date">
                                                                Completed: {new Date(task.completedAt).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        {task.isShared && <span className="shared-badge">Shared</span>}
                                                    </div>
                                                </div>
                                                <div className="archived-actions">
                                                    <button 
                                                        className="unarchive-button"
                                                        onClick={() => unarchiveTask(task.id)}
                                                    >
                                                        🔄 Unarchive
                                                    </button>
                                                    <button 
                                                        className="delete-button"
                                                        onClick={() => handleDelete(task.id)}
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        <div className="calendar-section">
                            <h3>Calendar</h3>
                            <div className="calendar-actions">
                                <button 
                                    className={`archive-toggle-button ${showArchived ? 'active' : ''}`}
                                    onClick={() => setShowArchived(!showArchived)}
                                >
                                    {showArchived ? '📋 Active' : '📦 Archived'}
                                </button>
                            </div>
                            <Calendar
                                localizer={localizer}
                                events={tasks.map(task => {
                                    // Properly handle different timestamp formats
                                    let start = task.timestamp;
                                    if (!start) return null;
                                    
                                    // If it's not already a Date object, convert it
                                    if (!(start instanceof Date)) {
                                        if (typeof start.toDate === 'function') {
                                            start = start.toDate();
                                        } else if (start.seconds) {
                                            start = new Date(start.seconds * 1000);
                                        } else {
                                            start = new Date(start);
                                        }
                                    }
                                    
                                    // Create a copy of the date for the end date and add 1 hour
                                    const end = new Date(start);
                                    end.setHours(end.getHours() + 1);
                                    
                                    return {
                                        title: task.task,
                                        start,
                                        end,
                                        allDay: false,
                                        resource: {
                                            priority: task.priority,
                                            completed: task.completed,
                                            category: task.category
                                        }
                                    };
                                }).filter(event => event !== null)}
                                startAccessor="start"
                                endAccessor="end"
                                style={{ height: 500 }}
                                eventPropGetter={(event) => {
                                    let backgroundColor = '#4caf50';
                                    if (!event.resource.completed) {
                                        // Color based on priority
                                        const colors = ['#90caf9', '#42a5f5', '#1e88e5', '#1565c0', '#0d47a1'];
                                        
                                        // Convert priority to a number index safely
                                        let priorityIndex = 0;
                                        
                                        if (event.resource.priority) {
                                            if (typeof event.resource.priority === 'number') {
                                                // If it's already a number, use it (1-indexed)
                                                priorityIndex = Math.min(Math.max(1, event.resource.priority), 5) - 1;
                                            } else if (typeof event.resource.priority === 'string') {
                                                // Map string priorities to indices
                                                const priorityMap = {
                                                    'low': 0,
                                                    'medium': 1, 
                                                    'high': 2,
                                                    'urgent': 3,
                                                    'critical': 4
                                                };
                                                priorityIndex = priorityMap[event.resource.priority.toLowerCase()] || 0;
                                            }
                                        }
                                        
                                        backgroundColor = colors[priorityIndex] || colors[0];
                                    }
                                    return { style: { backgroundColor } };
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="logout-section">
                    <motion.button
                        onClick={handleLogoutClick}
                        className="logout-button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Logout
                    </motion.button>
                </div>

                {showLogoutConfirm && (
                    <div className="confirmation-modal">
                        <div className="modal-content">
                            <h3>Are you sure you want to logout?</h3>
                            <div className="modal-buttons">
                                <button 
                                    onClick={confirmLogout} 
                                    className="confirm-button"
                                >
                                    Yes, Logout
                                </button>
                                <button 
                                    onClick={cancelLogout} 
                                    className="cancel-button"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Task Sharing Modal */}
                {sharingTask && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Share Task</h3>
                            <p>Share "{sharingTask.task}" with another user</p>
                            
                            <div className="form-group">
                                <label>Recipient Email:</label>
                                <input 
                                    type="email" 
                                    value={recipientEmail} 
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    placeholder="Enter email address"
                                />
                            </div>
                            
                            {shareMessage.message && (
                                <div className={`share-message ${shareMessage.type}`}>
                                    {shareMessage.message}
                                </div>
                            )}
                            
                            <div className="modal-actions">
                                <button className="cancel-button" onClick={closeShareDialog}>Cancel</button>
                                <button className="share-button" onClick={handleShareTask}>Share</button>
                            </div>
                        </div>
                    </div>
                )}

                {showInbox && (
                    <div className="inbox-section">
                        <h3>Inbox ({pendingSharedTasks.length})</h3>
                        <div className="inbox-list">
                            {pendingSharedTasks.map(task => (
                                <div key={task.id} className="inbox-item">
                                    <div className="inbox-task-info">
                                        <strong>{task.task}</strong>
                                        <div className="inbox-task-meta">
                                            <span className="inbox-task-from">From: {task.sharedBy}</span>
                                            {task.priority && (
                                                <span className={`inbox-task-priority priority-${typeof task.priority === 'string' ? task.priority.toLowerCase() : 'medium'}`}>
                                                    {task.priority}
                                                </span>
                                            )}
                                            {task.category && (
                                                <span className="inbox-task-category">
                                                    {task.category}
                                                </span>
                                            )}
                                            {task.dueDate && (
                                                <span className="inbox-task-date">
                                                    Due: {new Date(task.dueDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="inbox-actions">
                                        <button 
                                            className="accept-button"
                                            onClick={() => acceptSharedTask(task.id)}
                                        >
                                            Accept
                                        </button>
                                        <button 
                                            className="decline-button"
                                            onClick={() => declineSharedTask(task.id)}
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Dashboard;