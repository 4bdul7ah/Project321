import React, { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
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
  
    const selectedDate = new Date(timestamp);
    const now = new Date();
  
    if (selectedDate < now) {
      const proceed = window.confirm(
        '⚠️ You selected a past date/time. Do you want to continue and save this task anyway?'
      );
      if (!proceed) return;
    }
  
    try {
      const userTasksCollection = collection(db, 'users', currentUser.uid, 'tasks');
      await addDoc(userTasksCollection, {
        task,
        priority,
        timestamp: selectedDate,
      });
      alert('Task submitted successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error adding task: ', error);
      alert('Something went wrong!');
    }
  };
  

  if (loading) {
    return <div className="loading-message">Loading...</div>;
  }

  return (
    <div className="task-input-container">
      <h1>📝 Add a Task</h1>
      <form onSubmit={handleSubmit} className="task-input-form">
        <input
          type="text"
          placeholder="Task description"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Priority (1-5)"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          min="1"
          max="5"
          required
        />
        <div className="priority-help">
          <strong>Priority Guide:</strong><br />
          5 – Very High (e.g. final exam)<br />
          4 – High (e.g. project deadline)<br />
          3 – Medium (e.g. weekly task)<br />
          2 – Low (e.g. optional reading)<br />
          1 – Very Low (e.g. ideas or notes)
        </div>
        <input
          type="datetime-local"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          required
        />
        <button type="submit" className="task-submit-button">Add Task</button>
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
    fontSize: '1rem',
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