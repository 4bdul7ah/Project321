import React, { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase'; 
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

const TaskInput = () => {
  const [task, setTask] = useState('');
  const [priority, setPriority] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
        timestamp: new Date(),
      });
      alert('Task submitted successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error adding task: ', error);
      alert('Something went wrong!');
    }
  };

  if (loading) {
    return <div style={styles.container}>Loading...</div>;
  }

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