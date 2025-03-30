import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { deleteDoc, doc } from 'firebase/firestore';

const Dashboard = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);

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

    const handleLogout = async () => {
        try {
          await signOut(auth);
          console.log('User logged out');
          navigate('/login'); // redirect after logout
        } catch (error) {
          console.error('Logout error:', error.message);
          alert('Something went wrong logging out');
        }
    };
      return (
        <div style={styles.container}>
          <h1>🎉 Welcome to Your Dashboard!</h1>
          <p>You’re logged in and ready to go! 💼</p>
          <div style={styles.buttonContainer}>
            <Link to="/add-task" style={styles.link}>➕ Add a New Task</Link>
            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
          </div>
          <h2 style={{ marginTop: '40px' }}>Your Tasks</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
            {tasks.map(task => (
            <li key={task.id} style={styles.taskItem}>
            <strong>{task.task}</strong> — Priority: {task.priority}
            <button onClick={() => handleDelete(task.id)} style={styles.deleteButton}>🗑️</button>
        </li>
        ))}
        </ul>
        </div>
      );
    };

    const styles = {
        container: {
          textAlign: 'center',
          marginTop: '50px',
        },
        buttonContainer: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '15px',
          marginTop: '30px',
        },
        logoutButton: {
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#dc3545',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        },
        link: {
          display: 'inline-block',
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '5px',
        },

        taskItem: {
            backgroundColor: '#f9f9f9',
            padding: '10px',
            margin: '10px auto',
            width: '80%',
            borderRadius: '5px',
            textAlign: 'left',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        },

        deleteButton: {
            marginLeft: '15px',
            padding: '5px 10px',
            backgroundColor: '#dc3545',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            float: 'right'
        }

      };

export default Dashboard;