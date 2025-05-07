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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
                fetchTasks(user.uid);
                migrateTasks(user.uid);
            } else {
                navigate('/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        applyFilters();
        updateStats();
    }, [tasks, selectedCategory, selectedTag]);

    useEffect(() => {
        const catSet = new Set(tasks.map(t => t.category || 'uncategorized'));
        setCategories(['all', ...catSet]);
    }, [tasks]);

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
                    category: 'work',
                    tags: [],
                    completed: false,
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
            
            let querySnapshot;
            try {
                querySnapshot = await getDocs(tasksCollection);
                console.log(`Found ${querySnapshot.docs.length} total tasks`);
                
                const allTasks = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data
                    };
                });
                
                const activeTasks = allTasks.filter(task => !task.archived);
                console.log(`After filtering: ${activeTasks.length} active tasks`);
                
                const fetchedTasks = activeTasks.map(task => {
                    let formattedTimestamp = task.timestamp;
                    if (task.timestamp && typeof task.timestamp.toDate === 'function') {
                        formattedTimestamp = task.timestamp.toDate();
                    } else if (task.timestamp && task.timestamp.seconds) {
                        formattedTimestamp = new Date(task.timestamp.seconds * 1000);
                    }
                    
                    return {
                        id: task.id,
                        ...task,
                        timestamp: formattedTimestamp,
                        completedAt: task.completedAt && typeof task.completedAt.toDate === 'function' 
                            ? task.completedAt.toDate() 
                            : task.completedAt
                    };
                });
                
                fetchedTasks.sort((a, b) => b.priority - a.priority);
                
                console.log("Processed tasks:", fetchedTasks);
                
                setTasks(fetchedTasks);
                
                const allTags = fetchedTasks.flatMap(task => task.tags || []);
                const uniqueTagsSet = new Set(allTags);
                setUniqueTags(Array.from(uniqueTagsSet));
                
                return fetchedTasks;
                
            } catch (error) {
                console.error("Error with query, trying simpler approach:", error);
                querySnapshot = await getDocs(tasksCollection);
                
                const fetchedTasks = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        timestamp: data.timestamp?.toDate?.() || data.timestamp
                    };
                });
                
                setTasks(fetchedTasks);
                return fetchedTasks;
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
            return [];
        }
    };

    const applyFilters = () => {
        let filtered = [...tasks];
        
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(task => task.category === selectedCategory);
        }
        
        if (selectedTag) {
            filtered = filtered.filter(task => task.tags && task.tags.includes(selectedTag));
        }
        
        setFilteredTasks(filtered);
    };

    const updateStats = () => {
        const now = new Date();
        const newStats = {
            total: tasks.length,
            completed: tasks.filter(task => task.completed).length,
            overdue: tasks.filter(task => !task.completed && task.timestamp < now).length,
            byCategory: {},
            productivityTrend: []
        };

        tasks.forEach(task => {
            if (task.category) {
                if (!newStats.byCategory[task.category]) {
                    newStats.byCategory[task.category] = {
                        total: 0,
                        completed: 0
                    };
                }
                newStats.byCategory[task.category].total++;
                if (task.completed) {
                    newStats.byCategory[task.category].completed++;
                }
            }
        });

        setStats(newStats);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            try {
                await deleteDoc(doc(db, `users/${currentUser.uid}/tasks`, id));
                setTasks(tasks.filter(task => task.id !== id));
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    const handleToggleComplete = async (id, currentStatus) => {
        try {
            const taskRef = doc(db, `users/${currentUser.uid}/tasks`, id);
            const newStatus = !currentStatus;
            const updateData = {
                completed: newStatus,
                completedAt: newStatus ? new Date() : null
            };
            
            await updateDoc(taskRef, updateData);
            
            setTasks(tasks.map(task => 
                task.id === id 
                    ? { ...task, completed: newStatus, completedAt: updateData.completedAt }
                    : task
            ));

            if (newStatus) {
                await trackTaskCompletion(currentUser.uid, id);
            }
        } catch (error) {
            console.error('Error updating task:', error);
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
            console.error('Error signing out:', error);
        }
    };

    const cancelLogout = () => {
        setShowLogoutConfirm(false);
    };

    const handleShareTask = async () => {
        if (!recipientEmail) {
            setShareMessage({ type: 'error', message: 'Please enter a recipient email' });
            return;
        }

        try {
            const result = await shareTaskWithUser(currentUser.uid, sharingTask.id, recipientEmail);
            setShareMessage({ type: 'success', message: result.message });
            setRecipientEmail('');
            setSharingTask(null);
        } catch (error) {
            setShareMessage({ type: 'error', message: error.message });
        }
    };

    const closeShareDialog = () => {
        setSharingTask(null);
        setRecipientEmail('');
        setShareMessage({ type: '', message: '' });
    };

    const fetchDetailedAnalytics = async () => {
        try {
            const analytics = await getTaskAnalytics(currentUser.uid);
            setStats(prevStats => ({
                ...prevStats,
                productivityTrend: analytics.productivityTrend || []
            }));
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    };

    const fetchIncomingSharedTasks = async () => {
        try {
            const sharedTasksQuery = query(
                collection(db, `users/${currentUser.uid}/sharedTasks`),
                where('status', '==', 'pending')
            );
            const querySnapshot = await getDocs(sharedTasksQuery);
            const tasks = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPendingSharedTasks(tasks);
        } catch (error) {
            console.error('Error fetching shared tasks:', error);
        }
    };

    const acceptSharedTask = async (taskId) => {
        try {
            const taskRef = doc(db, `users/${currentUser.uid}/sharedTasks`, taskId);
            await updateDoc(taskRef, { status: 'accepted' });
            
            const taskDoc = await getDoc(taskRef);
            const taskData = taskDoc.data();
            
            const userTasksCollection = collection(db, `users/${currentUser.uid}/tasks`);
            await addDoc(userTasksCollection, {
                ...taskData,
                shared: true,
                sharedBy: taskData.sharedBy,
                created: new Date()
            });
            
            setPendingSharedTasks(pendingSharedTasks.filter(task => task.id !== taskId));
        } catch (error) {
            console.error('Error accepting shared task:', error);
        }
    };

    const declineSharedTask = async (taskId) => {
        try {
            const taskRef = doc(db, `users/${currentUser.uid}/sharedTasks`, taskId);
            await updateDoc(taskRef, { status: 'declined' });
            setPendingSharedTasks(pendingSharedTasks.filter(task => task.id !== taskId));
        } catch (error) {
            console.error('Error declining shared task:', error);
        }
    };

    const fetchArchivedTasks = async () => {
        try {
            const tasksCollection = collection(db, `users/${currentUser.uid}/tasks`);
            const querySnapshot = await getDocs(tasksCollection);
            
            const archived = querySnapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(task => task.archived)
                .map(task => ({
                    ...task,
                    timestamp: task.timestamp?.toDate?.() || task.timestamp
                }));
            
            setArchivedTasks(archived);
        } catch (error) {
            console.error('Error fetching archived tasks:', error);
        }
    };

    const unarchiveTask = async (taskId) => {
        try {
            const taskRef = doc(db, `users/${currentUser.uid}/tasks`, taskId);
            await updateDoc(taskRef, { archived: false });
            
            setArchivedTasks(archivedTasks.filter(task => task.id !== taskId));
            fetchTasks(currentUser.uid);
        } catch (error) {
            console.error('Error unarchiving task:', error);
        }
    };

    const handleGenerateAISchedule = async () => {
        setIsGenerating(true);
        try {
            const schedule = await getChatSchedule(tasks);
            setAiSchedule(schedule);
        } catch (error) {
            console.error('Error generating AI schedule:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Task Dashboard</h1>
                <div className="header-buttons">
                    <Link to="/task-input" className="add-task-button">
                        Add New Task
                    </Link>
                    <button 
                        className="stats-button"
                        onClick={() => setShowStats(!showStats)}
                    >
                        {showStats ? 'Hide Stats' : 'Show Stats'}
                    </button>
                    <button 
                        className="inbox-button"
                        onClick={() => setShowInbox(!showInbox)}
                    >
                        {showInbox ? 'Hide Inbox' : 'Show Inbox'}
                        {pendingSharedTasks.length > 0 && (
                            <span className="inbox-badge">{pendingSharedTasks.length}</span>
                        )}
                    </button>
                    <button 
                        className="archive-button"
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        {showArchived ? 'Hide Archived' : 'Show Archived'}
                    </button>
                    <button onClick={handleLogoutClick} className="logout-button">
                        Logout
                    </button>
                </div>
            </div>

            {showStats && (
                <motion.div 
                    className="stats-container"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                >
                    <div className="stats-grid">
                        <div className="stat-card">
                            <h3>Total Tasks</h3>
                            <p>{stats.total}</p>
                        </div>
                        <div className="stat-card">
                            <h3>Completed</h3>
                            <p>{stats.completed}</p>
                        </div>
                        <div className="stat-card">
                            <h3>Overdue</h3>
                            <p>{stats.overdue}</p>
                        </div>
                    </div>
                    
                    <div className="category-stats">
                        <h3>Tasks by Category</h3>
                        {Object.entries(stats.byCategory).map(([category, data]) => (
                            <div key={category} className="category-stat">
                                <div className="category-name">{category}</div>
                                <div className="progress-bar">
                                    <div 
                                        className="progress" 
                                        style={{ 
                                            width: `${(data.completed / data.total) * 100}%`,
                                            backgroundColor: data.completed === data.total ? '#4CAF50' : '#2196F3'
                                        }}
                                    />
                                </div>
                                <div className="category-count">
                                    {data.completed}/{data.total}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {showInbox && (
                <motion.div 
                    className="inbox-container"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                >
                    <h2>Shared Tasks Inbox</h2>
                    {pendingSharedTasks.length === 0 ? (
                        <p>No pending shared tasks</p>
                    ) : (
                        <div className="shared-tasks-list">
                            {pendingSharedTasks.map(task => (
                                <div key={task.id} className="shared-task-item">
                                    <div className="shared-task-info">
                                        <h3>{task.task}</h3>
                                        <p>Shared by: {task.sharedBy}</p>
                                        <p>Priority: {task.priority}</p>
                                        <p>Due: {task.timestamp?.toDate?.().toLocaleDateString()}</p>
                                    </div>
                                    <div className="shared-task-actions">
                                        <button 
                                            onClick={() => acceptSharedTask(task.id)}
                                            className="accept-button"
                                        >
                                            Accept
                                        </button>
                                        <button 
                                            onClick={() => declineSharedTask(task.id)}
                                            className="decline-button"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}

            {showArchived && (
                <motion.div 
                    className="archived-tasks-container"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                >
                    <h2>Archived Tasks</h2>
                    {archivedTasks.length === 0 ? (
                        <p>No archived tasks</p>
                    ) : (
                        <div className="archived-tasks-list">
                            {archivedTasks.map(task => (
                                <div key={task.id} className="archived-task-item">
                                    <div className="archived-task-info">
                                        <h3>{task.task}</h3>
                                        <p>Completed: {task.completed ? 'Yes' : 'No'}</p>
                                        <p>Archived on: {task.archivedAt?.toDate?.().toLocaleDateString()}</p>
                                    </div>
                                    <button 
                                        onClick={() => unarchiveTask(task.id)}
                                        className="unarchive-button"
                                    >
                                        Unarchive
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}

            <div className="filters-section">
                <div className="filter-group">
                    <label>Category:</label>
                    <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="filter-select"
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
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
                            <option key={tag} value={tag}>
                                {tag}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="tasks-section">
                    <h2>Your Tasks</h2>
                    {filteredTasks.length === 0 ? (
                        <p>No tasks found</p>
                    ) : (
                        <div className="tasks-list">
                            {filteredTasks.map(task => (
                                <motion.div 
                                    key={task.id}
                                    className={`task-item ${task.completed ? 'completed' : ''}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <div className="task-content">
                                        <h3>{task.task}</h3>
                                        <p>Priority: {task.priority}</p>
                                        <p>Due: {task.timestamp?.toLocaleDateString()}</p>
                                        {task.category && (
                                            <span className="task-category">{task.category}</span>
                                        )}
                                        {task.tags && task.tags.length > 0 && (
                                            <div className="task-tags">
                                                {task.tags.map(tag => (
                                                    <span key={tag} className="task-tag">{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="task-actions">
                                        <button 
                                            onClick={() => handleToggleComplete(task.id, task.completed)}
                                            className={`complete-button ${task.completed ? 'completed' : ''}`}
                                        >
                                            {task.completed ? 'Completed' : 'Mark Complete'}
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(task.id)}
                                            className="delete-button"
                                        >
                                            Delete
                                        </button>
                                        <button 
                                            onClick={() => setSharingTask(task)}
                                            className="share-button"
                                        >
                                            Share
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="calendar-section">
                    <h2>Task Calendar</h2>
                    <Calendar
                        localizer={localizer}
                        events={tasks.map(task => ({
                            id: task.id,
                            title: task.task,
                            start: task.timestamp,
                            end: task.timestamp,
                            priority: task.priority,
                            completed: task.completed
                        }))}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: 500 }}
                        eventPropGetter={(event) => ({
                            className: `priority-${event.priority} ${event.completed ? 'completed' : ''}`
                        })}
                    />
                </div>
            </div>

            {sharingTask && (
                <div className="share-dialog">
                    <div className="share-dialog-content">
                        <h3>Share Task</h3>
                        <input
                            type="email"
                            placeholder="Recipient's email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                        />
                        {shareMessage.message && (
                            <div className={`share-message ${shareMessage.type}`}>
                                {shareMessage.message}
                            </div>
                        )}
                        <div className="share-dialog-actions">
                            <button onClick={handleShareTask}>Share</button>
                            <button onClick={closeShareDialog}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {showLogoutConfirm && (
                <div className="logout-confirm">
                    <div className="logout-confirm-content">
                        <h3>Confirm Logout</h3>
                        <p>Are you sure you want to logout?</p>
                        <div className="logout-confirm-actions">
                            <button onClick={confirmLogout}>Yes, Logout</button>
                            <button onClick={cancelLogout}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
