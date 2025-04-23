import React, { useEffect, useState } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc, query, where, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import '../styles/Dashboard.css';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const Dashboard = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    

    useEffect(() => {
        // Changes by Abdullah: Added auth state listener to get current user
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
                fetchTasks(user.uid);
                migrateTasks(user.uid);  // Changes by Abdullah: Migrate tasks from old structure
            } else {
                // If not logged in, redirect to login
                navigate('/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate]);

    // Changes by Abdullah: Added function to migrate tasks from old structure to new nested structure
    const migrateTasks = async (userId) => {
        try {
            // Get tasks from old structure that belong to this user
            const oldTasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
            const querySnapshot = await getDocs(oldTasksQuery);
            
            // If we found tasks in the old structure, let's migrate them
            const batch = writeBatch(db);
            let count = 0;
            
            // Create a batch of operations
            for (const document of querySnapshot.docs) {
                const data = document.data();
                // Add to the new structure
                const userTasksCollection = collection(db, 'users', userId, 'tasks');
                await addDoc(userTasksCollection, {
                    task: data.task,
                    priority: data.priority,
                    timestamp: data.timestamp
                });
                
                // Delete from old structure
                const oldDocRef = doc(db, 'tasks', document.id);
                batch.delete(oldDocRef);
                count++;
            }
            
            if (count > 0) {
                await batch.commit();
                console.log(`Migrated ${count} tasks to new structure for user ${userId}`);
                // Refresh tasks after migration
                fetchTasks(userId);
            }
        } catch (error) {
            console.error('Error migrating tasks:', error);
        }
    };

    const fetchTasks = async (userId) => {
        try {
            // Changes by Abdullah: Using nested collection structure with userID/tasks
            const tasksCollection = collection(db, 'users', userId, 'tasks');
            const querySnapshot = await getDocs(tasksCollection);
            const taskList = querySnapshot.docs.map(doc => {
                const data = doc.data(); // ✅ define `data` here
                return {
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate?.() ?? null,
                };
            });
            // Sort tasks by priority (highest to lowest) //Abdullah Changes.
            taskList.sort((a, b) => b.priority - a.priority);
            setTasks(taskList);
        } catch (error) {
            console.error('Error fetching tasks:', error.message);
        }   
    };

    const calendarEvents = tasks
    .filter(task => task.timestamp)
    .map(task => ({
        title: task.task,
        start: task.timestamp,
        end: new Date(new Date(task.timestamp).getTime() + 60 * 60 * 1000), // 1 hour duration
    }));

    const handleDelete = async (id) => {
        try {
            // Changes by Abdullah: Delete from nested collection
            await deleteDoc(doc(db, 'users', currentUser.uid, 'tasks', id));
            setTasks(tasks.filter(task => task.id !== id));
        } catch (error) {
            console.error('Error deleting task:', error.message);
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
                    <Link to="/add-task" className="add-task-button">
                        ➕ Add New Task
                    </Link>
                
                    <div className="dashboard-main">
                    <div className="tasks-section">
                        <h3>Your Tasks</h3>
                        {tasks.length > 0 ? (
                            <ul className="task-list">
                                {tasks.map(task => (
                                    <motion.li 
                                        key={task.id}
                                        className="task-item"
                                        whileHover={{ x: 5 }}
                                    >
                                        <div className="task-info">
                                            <strong>{task.task}</strong>
                                            <span>Priority: {task.priority}</span>
                                            {task.timestamp && (
                                                <>
                                                    <div style={{ marginTop: '6px' }}>
                                                    📅 {task.timestamp.toLocaleDateString()}
                                                    </div>
                                                    <div>
                                                        🕒 {task.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(task.id)}
                                            className="delete-button"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </motion.li>
                                ))}
                            </ul>
                        ) : (
                            <p className="empty-state">No tasks yet. Add your first task!</p>
                        )}
                    </div>
                    
                    <div className= "calendar-section">
                      {/*Insert your calendar component here later*/}
                      <h3>Calendar</h3>
                      <Calendar
                        localizer={localizer}
                        events={calendarEvents} // or  Firebase events later
                        startAccessor="start"
                        endAccessor="end"
                        defaultView="month" 
                        defaultDate={new Date()}
                        views={['month', 'week', 'day']}
                        style={{ height: 500, width: '100%' }}
                        onNavigate={(date) => console.log('Navigated to:', date)}
                        onView={(view) => console.log('View changed to:', view)}
                        onRangeChange={(range) => console.log('Range changed:', range)}
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

                {/* Logout Confirmation Modal */}
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
            </div>
        </motion.div>
    );
};

export default Dashboard;