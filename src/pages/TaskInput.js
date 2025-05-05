import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { setTaskReminder } from '../utils/taskUtils';
import { Timestamp } from 'firebase/firestore';
import '../styles/TaskInput.css';

const TaskInput = () => {
  const [task, setTask] = useState('');
  const [priority, setPriority] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timestamp, setTimestamp] = useState('');
  const [category, setCategory] = useState('work');
  const [tags, setTags] = useState('');
  const [categories, setCategories] = useState(['work', 'personal', 'education', 'health', 'other']);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderMessage, setReminderMessage] = useState({ type: '', message: '' });
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchUserCategories(user.uid);
      } else {
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchUserCategories = async (userId) => {
    try {
      const categoriesCollection = collection(db, 'users', userId, 'categories');
      const querySnapshot = await getDocs(categoriesCollection);
      
      if (!querySnapshot.empty) {
        const userCategories = querySnapshot.docs.map(doc => doc.data().name);
        setCategories([...new Set([...categories, ...userCategories])]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!task.trim()) {
        alert('Please enter a task');
        return;
    }

    try {
        const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : [];
        
        // Add task with category and tags
        const userTasksCollection = collection(db, 'users', currentUser.uid, 'tasks');
        
        // Create task object
        const taskData = {
            task,
            priority: parseInt(priority),
            completed: false,
            createdAt: new Date(),
            category: category || 'other',
            tags: tagArray,
            archived: false,  // Explicitly set archived to false for new tasks
        };
        
        // Only add timestamp if it's provided
        if (timestamp) {
            taskData.timestamp = Timestamp.fromDate(new Date(timestamp));
        }
        
        const docRef = await addDoc(userTasksCollection, taskData);
        
        // Update categories list if it's a new category
        if (category && !categories.includes(category)) {
            setCategories([...categories, category]);
        }
        
        // Set reminder if date and time are provided
        if (reminderDate && reminderTime) {
            await handleAddReminder(docRef.id);
        }

        // Reset form
        setTask('');
        setPriority(3);
        setTimestamp('');
        setCategory('');
        setTags('');
        setReminderDate('');
        setReminderTime('');
        
        alert('Task submitted successfully!');
    } catch (error) {
        console.error('Error adding task:', error);
        alert('Error adding task: ' + error.message);
    }
  };

  const handleAddReminder = async (taskId) => {
    if (!reminderDate || !reminderTime) {
      setReminderMessage({ type: 'error', message: 'Please select both date and time for the reminder' });
      return;
    }
  
    try {
      const reminderDateTime = new Date(`${reminderDate}T${reminderTime}`);
      
      if (reminderDateTime <= new Date()) {
        setReminderMessage({ type: 'error', message: 'Reminder time must be in the future' });
        return;
      }
      
      setReminderMessage({ type: 'info', message: 'Setting reminder...' });
      const result = await setTaskReminder(currentUser.uid, taskId, reminderDateTime);
      
      if (result.success) {
        setReminderMessage({ type: 'success', message: 'Reminder set successfully' });
        // Reset reminder fields
        setReminderDate('');
        setReminderTime('');
        // Close modal or form after a delay
        setTimeout(() => {
          setReminderMessage({ type: '', message: '' });
        }, 3000);
      } else {
        setReminderMessage({ type: 'error', message: result.message });
      }
    } catch (error) {
      console.error('Error setting reminder:', error);
      setReminderMessage({ type: 'error', message: 'Failed to set reminder' });
    }
  };
  

  const navigateBack = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return <div className="task-input-container">Loading...</div>;
  }

  return (
    <div className="task-input-container">
      <button className="close-button" onClick={navigateBack}>✕</button>
      <h2>Add a New Task</h2>
      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group">
          <label>Task:</label>
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Enter task"
            required
          />
        </div>

        <div className="form-group">
          <label>Priority (1-5):</label>
          <div className="priority-selector">
            {[1, 2, 3, 4, 5].map((value) => (
              <span
                key={value}
                className={`priority-star ${value <= priority ? 'selected' : ''}`}
                onClick={() => setPriority(value)}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Category:</label>
          <select
            value={category}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setShowCustomCategory(true);
              } else {
                setCategory(e.target.value);
                setShowCustomCategory(false);
              }
            }}
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
            <option value="custom">Add custom category</option>
          </select>

          {showCustomCategory && (
            <div className="custom-category">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category"
              />
              <button
                type="button"
                onClick={() => {
                  if (customCategory.trim() !== '') {
                    setCategory(customCategory);
                    setShowCustomCategory(false);
                  }
                }}
              >
                Add
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Tags (comma-separated):</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. urgent, project, meeting"
          />
        </div>

        <div className="form-group">
          <label>Due Date:</label>
          <input
            type="date"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group">
          <label>Reminder:</label>
          <div className="reminder-inputs">
            <input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              placeholder="Reminder date"
            />
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              placeholder="Reminder time"
            />
          </div>
          {reminderMessage.message && (
            <div className={`reminder-message ${reminderMessage.type}`}>
              {reminderMessage.message}
            </div>
          )}
        </div>

        <button type="submit" className="add-task-btn">
          Add Task
        </button>
      </form>
    </div>
  );
};

export default TaskInput;