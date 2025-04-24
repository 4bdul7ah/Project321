<<<<<<< HEAD
import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase'; // make sure db is exported from firebase.js
import { useNavigate } from 'react-router-dom';
=======
import React, { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase'; 
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
>>>>>>> mariana-auth

const TaskInput = () => {
  const [task, setTask] = useState('');
  const [priority, setPriority] = useState(1);
<<<<<<< HEAD
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'tasks'), {
        task,
        priority,
        timestamp: new Date(),
=======
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
>>>>>>> mariana-auth
      });
      alert('Task submitted successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error adding task: ', error);
      alert('Something went wrong!');
    }
  };

<<<<<<< HEAD
=======
  if (loading) {
    return <div style={styles.container}>Loading...</div>;
  }

>>>>>>> mariana-auth
  return (
    <div style={styles.container}>
      <h1>📝 Add a Task</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Task description"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="number"
          placeholder="Priority (1-5)"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          style={styles.input}
          min="1"
          max="5"
          required
        />
<<<<<<< HEAD
=======
        <input
          type="datetime-local"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          style={{
            ...styles.input,
            backgroundColor: '#fef6ff', // pastel lavender
            color: '#333',
            fontSize: '1rem',
          }}
          required

        />
>>>>>>> mariana-auth
        <button type="submit" style={styles.button}>Add Task</button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    marginTop: '50px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  input: {
    margin: '10px',
    padding: '10px',
    width: '300px',
    borderRadius: '5px',
    border: '1px solid #ccc',
<<<<<<< HEAD
=======
    fontSize: '1rem',
>>>>>>> mariana-auth
  },
  button: {
    marginTop: '15px',
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

export default TaskInput;