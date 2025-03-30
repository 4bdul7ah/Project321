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
                    timestamp: data.timestamp
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
            const tasksCollection = collection(db, 'users', userId, 'tasks');
            const querySnapshot = await getDocs(tasksCollection);
            const taskList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate?.() ?? null,
                };
            });
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
            end: moment(task.timestamp).add(1, 'hour').toDate(),
            priority: task.priority
        }));

    const handleDelete = async (id) => {
        try {
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
            alert('Something went wrong logging out');
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
        >
            <div className="dashboard-header">
                <h1>🎉 Welcome to Your Dashboard!</h1>
                <p>You're logged in and ready to go! 💼</p>
            </div>

            <div className="dashboard-content">
                <div className="dashboard-actions">
                    <Link to="/add-task" className="add-task-button">➕ Add a New Task</Link>
                    <button onClick={handleLogoutClick} className="logout-button">Logout</button>
                </div>

                {showLogoutConfirm && (
                    <div className="logout-confirm">
                        <p>Are you sure you want to logout?</p>
                        <div className="confirm-buttons">
                            <button onClick={confirmLogout} className="confirm-button">Yes, Logout</button>
                            <button onClick={cancelLogout} className="cancel-button">Cancel</button>
                        </div>
                    </div>
                )}

                <div className="tasks-section">
                    <h2>Your Tasks</h2>
                    <div className="tasks-list">
                        {tasks.map(task => (
                            <motion.div
                                key={task.id}
                                className="task-item"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <div className="task-content">
                                    <strong>{task.task}</strong>
                                    <span className="priority-badge">Priority: {task.priority}</span>
                                </div>
                                <button 
                                    onClick={() => handleDelete(task.id)} 
                                    className="delete-button"
                                >
                                    🗑️
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="calendar-section">
                    <h2>Task Calendar</h2>
                    <div className="calendar-container">
                        <Calendar
                            localizer={localizer}
                            events={calendarEvents}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: 500 }}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Dashboard;