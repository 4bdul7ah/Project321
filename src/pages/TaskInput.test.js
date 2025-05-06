import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskInput from './TaskInput';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { setTaskReminder } from '../utils/taskUtils';

// Mock Firebase Auth
jest.mock('../firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user' },
    onAuthStateChanged: jest.fn()
  },
  db: {}
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    fromDate: jest.fn(date => date)
  }
}));

// Mock taskUtils
jest.mock('../utils/taskUtils', () => ({
  setTaskReminder: jest.fn()
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('TaskInput Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth state change
    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback({ uid: 'test-user' });
      return jest.fn(); // unsubscribe function
    });
    
    // Mock successful category fetch
    getDocs.mockResolvedValue({
      empty: true,
      docs: []
    });
    
    // Mock successful task addition
    addDoc.mockResolvedValue({ id: 'new-task-id' });
    
    // Mock successful reminder setting
    setTaskReminder.mockResolvedValue({ success: true });
  });

  const renderTaskInput = () => {
    render(
      <MemoryRouter initialEntries={['/task-input']}>
        <Routes>
          <Route path="/task-input" element={<TaskInput />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('should render the task input form', async () => {
    renderTaskInput();
    
    // Wait for auth check to complete
    await waitFor(() => expect(screen.getByText('Add a New Task')).toBeInTheDocument());
    
    // Check for form elements - using getByText for labels and then checking for inputs
    expect(screen.getByText(/task:/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter task')).toBeInTheDocument();
    expect(screen.getByText(/priority/i)).toBeInTheDocument();
    expect(screen.getByText(/category:/i)).toBeInTheDocument();
    expect(screen.getByText(/tags/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. urgent, project, meeting')).toBeInTheDocument();
    expect(screen.getByText(/due date:/i)).toBeInTheDocument();
    expect(screen.getByText(/reminder:/i)).toBeInTheDocument();
    expect(screen.getByText('Add Task')).toBeInTheDocument();
  });

  it('should navigate to login if user is not authenticated', async () => {
    // Override auth mock for this test
    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback(null); // No user
      return jest.fn();
    });

    renderTaskInput();
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('should navigate back to dashboard when close button is clicked', async () => {
    renderTaskInput();
    
    await waitFor(() => expect(screen.getByText('Add a New Task')).toBeInTheDocument());
    
    // Click close button
    fireEvent.click(screen.getByText('✕'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('should add a task successfully', async () => {
    // Mock window.alert before rendering
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
  
    renderTaskInput();
    
    await waitFor(() => expect(screen.getByText('Add a New Task')).toBeInTheDocument());
    
    // Fill out the form
    fireEvent.change(screen.getByPlaceholderText('Enter task'), { target: { value: 'Test Task' } });
    fireEvent.click(screen.getAllByText('★')[2]); // Select priority 3
    fireEvent.change(screen.getByPlaceholderText('e.g. urgent, project, meeting'), { target: { value: 'test,jest' } });
    
    // Select category
    const categoryLabel = screen.getByText(/category:/i);
    const categorySelect = categoryLabel.closest('.form-group').querySelector('select');
    fireEvent.change(categorySelect, { target: { value: 'work' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Add Task'));
    
    await waitFor(() => {
      // Verify Firestore call
      expect(addDoc).toHaveBeenCalledWith(
        undefined, // collection mock
        expect.objectContaining({
          task: 'Test Task',
          priority: 3,
          completed: false,
          category: 'work',
          tags: ['test', 'jest'],
          archived: false,
          createdAt: expect.any(Date)
        })
      );
      
      // Verify alert was shown
      expect(alertMock).toHaveBeenCalledWith('Task submitted successfully!');
    });
  
    // Clean up mock
    alertMock.mockRestore();
  });

  it('should show an alert if task is empty', async () => {
    renderTaskInput();
    
    await waitFor(() => expect(screen.getByText('Add a New Task')).toBeInTheDocument());
    
    // Make sure task field is empty (it should be by default)
    const taskInput = screen.getByPlaceholderText('Enter task');
    expect(taskInput.value).toBe('');
    
    // Don't fill in task field, but submit form
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    fireEvent.click(screen.getByText('Add Task'));
    
    expect(alertMock).toHaveBeenCalledWith('Please enter a task');
    alertMock.mockRestore();
  });

  it('should set a reminder correctly', async () => {
    renderTaskInput();
    
    await waitFor(() => expect(screen.getByText('Add a New Task')).toBeInTheDocument());
    
    // Fill out the form with reminder
    fireEvent.change(screen.getByPlaceholderText('Enter task'), { target: { value: 'Test Task with Reminder' } });
    
    // Set reminder date and time - find the reminder inputs in the reminder-inputs div
    const reminderLabel = screen.getByText(/reminder:/i);
    const reminderFormGroup = reminderLabel.closest('.form-group');
    const reminderInputsDiv = reminderFormGroup.querySelector('.reminder-inputs');
    const reminderInputs = reminderInputsDiv.querySelectorAll('input');
    
    fireEvent.change(reminderInputs[0], { target: { value: '2025-12-31' } });
    fireEvent.change(reminderInputs[1], { target: { value: '12:00' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Add Task'));
    
    await waitFor(() => {
      expect(setTaskReminder).toHaveBeenCalledWith(
        'test-user',
        'new-task-id',
        expect.any(Date)
      );
    });
  });

  it('should handle custom category addition', async () => {
    renderTaskInput();
    
    await waitFor(() => expect(screen.getByText('Add a New Task')).toBeInTheDocument());
    
    // Select custom category option
    const categoryLabel = screen.getByText(/category:/i);
    const categoryFormGroup = categoryLabel.closest('.form-group');
    const categorySelect = categoryFormGroup.querySelector('select');
    fireEvent.change(categorySelect, { target: { value: 'custom' } });
    
    // Enter custom category
    const customCategoryInput = screen.getByPlaceholderText('Enter custom category');
    fireEvent.change(customCategoryInput, { target: { value: 'Test Custom Category' } });
    
    // Click add button for custom category
    fireEvent.click(screen.getByText('Add'));
    
    // Fill task and submit
    fireEvent.change(screen.getByPlaceholderText('Enter task'), { target: { value: 'Task with custom category' } });
    fireEvent.click(screen.getByText('Add Task'));
    
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          task: 'Task with custom category',
          category: 'Test Custom Category'
        })
      );
    });
  });

  it('should load user categories from Firestore', async () => {
    // Mock user categories
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        { data: () => ({ name: 'meetings' }) },
        { data: () => ({ name: 'project-x' }) }
      ]
    });
    
    renderTaskInput();
    
    await waitFor(() => {
      expect(collection).toHaveBeenCalledWith(db, 'users', 'test-user', 'categories');
    });
    
    // Check if categories are loaded
    await waitFor(() => {
      const categoryLabel = screen.getByText(/category:/i);
      const categoryFormGroup = categoryLabel.closest('.form-group');
      const categorySelect = categoryFormGroup.querySelector('select');
      
      expect(categorySelect.innerHTML).toContain('meetings');
      expect(categorySelect.innerHTML).toContain('project-x');
    });
  });

  it('should handle error when adding a task', async () => {
    // Mock an error when adding task
    const testError = new Error('Test error');
    addDoc.mockRejectedValueOnce(testError);
    
    renderTaskInput();
    
    await waitFor(() => expect(screen.getByText('Add a New Task')).toBeInTheDocument());
    
    // Fill minimum required fields
    fireEvent.change(screen.getByPlaceholderText('Enter task'), { target: { value: 'Error Task' } });
    
    // Mock console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock alert
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    // Submit form
    fireEvent.click(screen.getByText('Add Task'));
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error adding task:', testError);
      expect(alertMock).toHaveBeenCalledWith('Error adding task: Test error');
    });
    
    consoleErrorSpy.mockRestore();
    alertMock.mockRestore();
  });

  it('should validate that reminder time is in the future', async () => {
    // Mock Date.now to return a fixed date
    const originalDate = global.Date;
    const mockDate = new Date('2025-01-01T12:00:00');
    global.Date = class extends Date {
      constructor(...args) {
        return args.length ? new originalDate(...args) : mockDate;
      }
      static now() {
        return mockDate.getTime();
      }
    };
    
    renderTaskInput();
    
    await waitFor(() => expect(screen.getByText('Add a New Task')).toBeInTheDocument());
    
    // Fill out form with past reminder date
    fireEvent.change(screen.getByPlaceholderText('Enter task'), { target: { value: 'Task with Invalid Reminder' } });
    
    // Set reminder date to today and time to now (which will be in the past compared to our mock)
    const reminderLabel = screen.getByText(/reminder:/i);
    const reminderFormGroup = reminderLabel.closest('.form-group');
    const reminderInputsDiv = reminderFormGroup.querySelector('.reminder-inputs');
    const reminderInputs = reminderInputsDiv.querySelectorAll('input');
    
    fireEvent.change(reminderInputs[0], { target: { value: '2025-01-01' } });
    fireEvent.change(reminderInputs[1], { target: { value: '10:00' } }); // Earlier than our mock time
    
    // Submit form
    fireEvent.click(screen.getByText('Add Task'));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText('Reminder time must be in the future')).toBeInTheDocument();
      expect(setTaskReminder).not.toHaveBeenCalled();
    });
    
    // Restore original Date
    global.Date = originalDate;
  });

  it('should sort tags and remove empty ones', async () => {
    renderTaskInput();
    
    await waitFor(() => expect(screen.getByText('Add a New Task')).toBeInTheDocument());
    
    // Fill form with messy tags
    fireEvent.change(screen.getByPlaceholderText('Enter task'), { target: { value: 'Tag Test' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. urgent, project, meeting'), { target: { value: 'tag1, , tag2,  , tag3' } });
    
    // Submit form
    fireEvent.click(screen.getByText('Add Task'));
    
    // Check tags are cleaned up
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          tags: ['tag1', 'tag2', 'tag3']
        })
      );
    });
  });
});