import React, { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { motion } from 'framer-motion';
import '../styles/TaskInput.css';

const TaskInput = () => {
  const [task, setTask] = useState('');
  const [priority, setPriority] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timestamp, setTimestamp] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('You must be logged in to add tasks.');
      navigate('/login');
      return;
    }
    
    try {
      const userTasksCollection = collection(db, 'users', currentUser.uid, 'tasks');
      await addDoc(userTasksCollection, {
        task,
        priority,
        timestamp: new Date(timestamp),
      });
      alert('Task submitted successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error adding task: ', error);
      alert('Something went wrong!');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <motion.div 
      className="task-input-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <h1>📝 Add a Task</h1>
      <form onSubmit={handleSubmit} className="task-form">
        <input
          type="text"
          placeholder="Task description"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          className="task-input"
          required
        />
        <input
          type="number"
          placeholder="Priority (1-5)"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="task-input"
          min="1"
          max="5"
          required
        />
        <input
          type="datetime-local"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          className="task-input datetime-input"
          required
        />
        <motion.button 
          type="submit" 
          className="submit-button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Add Task
        </motion.button>
      </form>
    </motion.div>
  );
};

export default TaskInput;