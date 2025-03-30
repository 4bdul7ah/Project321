import React, { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import '../styles/Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'tasks'));
                const taskList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setTasks(taskList);
            } catch (error) {
                console.error('Error fetching tasks:', error.message);
            }   
        };
        fetchTasks();
    }, []);

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, 'tasks', id));
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