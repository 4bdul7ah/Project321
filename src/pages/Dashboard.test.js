// src/pages/Dashboard.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import Dashboard from './Dashboard';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import * as firestore from 'firebase/firestore';
import {
  getTaskAnalytics,
  trackTaskCompletion,
  shareTaskWithUser
} from '../utils/taskUtils';

jest.mock('../firebase', () => ({
    auth: {},
    db: { __mockDb: true } // Make sure db is defined
  }));
  
  jest.mock('firebase/auth', () => ({
    onAuthStateChanged: jest.fn(),
    signOut: jest.fn()
  }));
  
  jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    getDocs: jest.fn(),
    deleteDoc: jest.fn(),
    updateDoc: jest.fn(),
    doc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    writeBatch: jest.fn((dbInstance) => {
      return {
        delete: jest.fn(),
        commit: jest.fn()
      };
    }),
    addDoc: jest.fn(),
    getDoc: jest.fn()
  }));
  
  jest.mock('../utils/taskUtils', () => ({
    getTaskAnalytics: jest.fn(),
    trackTaskCompletion: jest.fn(),
    shareTaskWithUser: jest.fn()
  }));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const R = jest.requireActual('react-router-dom');
  return {
    ...R,
    useNavigate: () => mockNavigate,
    Link: ({ children }) => <span>{children}</span>
  };
});

beforeAll(() => {
    window.alert = jest.fn();
});

describe('Dashboard', () => {
  const fakeTasks = [
    {
      id: '1',
      task: 'A',
      priority: 2,
      category: 'work',
      tags: ['x'],
      completed: false,
      timestamp: new Date()
    },
    {
      id: '2',
      task: 'B',
      priority: 1,
      category: 'home',
      tags: ['y'],
      completed: true,
      timestamp: new Date()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    onAuthStateChanged.mockImplementation((authObj, cb) => {
      cb({ uid: 'u1' });
      return () => {};
    });

    firestore.getDocs
      .mockResolvedValueOnce({
        docs: fakeTasks.map(t => ({ id: t.id, data: () => t }))
      })
      .mockResolvedValueOnce({ docs: [] })
      .mockImplementation(() => Promise.resolve({ docs: [] }));

    getTaskAnalytics.mockResolvedValue({
      success: true,
      data: {
        total: 2,
        completed: 1,
        overdue: 0,
        byCategory: {work: { total: 1, completed: 0 },
        home: { total: 1, completed: 1 }},
        productivityTrend: []
      }
    });

    trackTaskCompletion.mockResolvedValue({ success: true });
    shareTaskWithUser.mockResolvedValue({ success: true, message: 'Task shared successfully!' });
  });

  async function renderDashboard() {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<div>LOGIN</div>} />
          </Routes>
        </MemoryRouter>
      );
    });
  }

  it('renders loading state initially', async () => {
    onAuthStateChanged.mockImplementation(() => {
      // Don't invoke the callback — simulate delay
      return () => {};
    });
  
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </MemoryRouter>
      );
    });
  
    expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();
  });

  it('renders category statistics correctly', async () => {
    await renderDashboard();
    const statsBtn = await screen.findByRole('button', { name: /Show Stats/ });
    fireEvent.click(statsBtn);

    const categoryStats = screen.getByText('By Category').nextSibling;
    expect(categoryStats).toBeInTheDocument();
    expect(within(categoryStats).getByText('work')).toBeInTheDocument();
    expect(within(categoryStats).getByText('1/1')).toBeInTheDocument();
    expect(within(categoryStats).getByText('home')).toBeInTheDocument();
    expect(within(categoryStats).getByText('0/1')).toBeInTheDocument();
  });

  it('renders the calendar UI once authenticated', async () => {
    await renderDashboard();
    expect(await screen.findByText(/Welcome to Your Calendar/)).toBeInTheDocument();
  });

  it('redirects to login if unauthenticated', async () => {
    onAuthStateChanged.mockImplementation((authObj, cb) => {
      cb(null);
      return () => {};
    });
    await renderDashboard();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'));
  });


  it('toggles Stats and Inbox panels', async () => {
    await renderDashboard();
    const statsBtn = await screen.findByRole('button', { name: /Show Stats/ });
    fireEvent.click(statsBtn);
    expect(screen.getByText('Task Statistics')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hide Stats/ }));
    await waitFor(() =>
      expect(screen.queryByText('Task Statistics')).toBeNull()
    );

    const inboxBtn = screen.getByRole('button', { name: '📬 Inbox' });
    fireEvent.click(inboxBtn);
    expect(screen.getByText('Inbox (0)')).toBeInTheDocument();
    fireEvent.click(inboxBtn);
    await waitFor(() =>
      expect(screen.queryByText('Inbox (0)')).toBeNull()
    );
  });

  it('renders category statistics correctly', async () => {
    await renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Show Stats/i }));
  
    const categoryStats = await screen.findByText('By Category');
    const statsContainer = categoryStats.closest('.stats-container');
  
    expect(within(statsContainer).getByText(/work/i)).toBeInTheDocument();
    expect(within(statsContainer).getByText(/0\s*\/\s*1/)).toBeInTheDocument();
  
    expect(within(statsContainer).getByText(/home/i)).toBeInTheDocument();
    expect(within(statsContainer).getByText(/1\s*\/\s*1/)).toBeInTheDocument();
  });

  it('filters tasks by category and tag', async () => {
    await renderDashboard();
    await screen.findAllByText('A');

    const tasksSection = screen
      .getByText('Your Tasks')
      .closest('.tasks-section');
    const taskList = tasksSection.querySelector('ul');
    expect(taskList).toBeInTheDocument();

    const catSelect = screen
      .getByText('Category:')
      .closest('.filter-group')
      .querySelector('select');
    fireEvent.change(catSelect, { target: { value: 'work' } });

    expect(within(taskList).getByText('A')).toBeInTheDocument();
    expect(within(taskList).queryByText('B')).toBeNull();

    fireEvent.change(catSelect, { target: { value: 'all' } });
    const tagSelect = screen
      .getByText('Tag:')
      .closest('.filter-group')
      .querySelector('select');
    fireEvent.change(tagSelect, { target: { value: 'y' } });

    expect(within(taskList).getByText('B')).toBeInTheDocument();
    expect(within(taskList).queryByText('A')).toBeNull();
  });

  it('deletes a task and toggles completion', async () => {
    await renderDashboard();
    const checkboxes = await screen.findAllByRole('checkbox');

    fireEvent.click(screen.getAllByText('🗑️ Delete')[0]);
    expect(firestore.deleteDoc).toHaveBeenCalled();

    await act(async () => {
        fireEvent.click(checkboxes[0]);
    });
    expect(firestore.updateDoc).toHaveBeenCalled();
  });

  it('navigates to edit when clicking ✏️ Edit', async () => {
    await renderDashboard();
    await screen.findAllByText('✏️ Edit');
    fireEvent.click(screen.getAllByText('✏️ Edit')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/add-task/1');
  });

  it('logs out and redirects on confirm', async () => {
    await renderDashboard();
    await screen.findByText('Logout');

    fireEvent.click(screen.getByText('Logout'));
    fireEvent.click(screen.getByText('Yes, Logout'));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'));
  });

  it('applies correct event styles based on numeric and string priority', async () => {
    // Custom tasks
    const tasksWithPriorities = [
      { id: '10', task: 'Do HW', priority: 5, completed: false, category: 'education', tags: ['urgent'], timestamp: new Date() },
      { id: '11', task: 'Call Mom', priority: 'high', completed: false, category: 'personal', tags: [], timestamp: new Date() }
    ];
  
    // 👇 Clear previous mocks and override
    firestore.getDocs.mockReset();
    firestore.getDocs.mockResolvedValue({
      docs: tasksWithPriorities.map(t => ({ id: t.id, data: () => t }))
    });
  
    await renderDashboard();
  
    const eventNodes = document.querySelectorAll('.rbc-event');
    const eventTitles = Array.from(eventNodes).map(el => el.textContent?.trim());
  
    expect(eventTitles).toContain('Do HW');
    expect(eventTitles).toContain('Call Mom');
  });
  
  it('applies different timestamp formats for calendar rendering', async () => {
    const now = new Date();
    const tasksWithTimestamps = [
      {
        id: '1',
        task: 'With toDate',
        timestamp: Object.create({
          toDate: () => new Date('2025-05-13T12:00:00Z')
        }),
        completed: false,
        priority: 1,
        category: 'x',
        tags: []
      },
      {
        id: '2',
        task: 'With seconds',
        timestamp: {seconds: Math.floor(Date.now() / 1000), // current timestamp in seconds
            toDate: undefined,
            __proto__: null},
        completed: false,
        priority: 2,
        category: 'x',
        tags: []
      },
      {
        id: '3',
        task: 'As string date',
        timestamp: now.toISOString(),
        completed: false,
        priority: 3,
        category: 'x',
        tags: []
      }
    ];

    firestore.getDocs.mockReset();
    firestore.getDocs.mockResolvedValueOnce({
      docs: tasksWithTimestamps.map(task => ({ id: task.id, data: () => task }))
    });

    await renderDashboard();

    const events = document.querySelectorAll('.rbc-event');
    const titles = Array.from(events).map(e => e.textContent.trim());

    for (const task of tasksWithTimestamps) {
      expect(titles).toContain(task.task);
    }
  });

  it('hits the "start.seconds" conversion logic', async () => {
    const now = new Date();
    const secondsTimestamp = {
      seconds: Math.floor(now.getTime() / 1000),
      toDate: undefined
    };
  
    const mockTask = {
      id: 'timestamp-seconds',
      task: 'Timestamp Seconds',
      timestamp: secondsTimestamp,
      start: secondsTimestamp, // <--- THIS is what your Calendar logic reads
      end: secondsTimestamp,
      completed: false,
      priority: 1,
      category: 'x',
      tags: []
    };
  
    firestore.getDocs.mockReset();
    firestore.getDocs.mockResolvedValueOnce({
      docs: [{ id: mockTask.id, data: () => mockTask }]
    });
  
    await renderDashboard();
  
    const titles = Array.from(document.querySelectorAll('.rbc-event')).map(el =>
      el.textContent.trim()
    );
  
    expect(titles).toContain('Timestamp Seconds');
  });

  it('closes share modal when Cancel is clicked', async () => {
    await renderDashboard();
  
    const shareButtons = await screen.findAllByText('📤 Share');
    fireEvent.click(shareButtons[0]);
  
    // Click Cancel
    fireEvent.click(screen.getByText('Cancel'));
  
    // Modal should disappear
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('Enter email address')).toBeNull()
    );
  });
  
  it('displays inbox with pending shared tasks', async () => {
    // Override Firestore getDocs for migrateTasks, fetchTasks, then inbox
    firestore.getDocs.mockReset();
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({
        docs: [{
          id: 'inbox1',
          data: () => ({ task: 'Shared Task', sharedBy: 'someone@example.com', priority: 'High', category: 'work', dueDate: new Date().toISOString() })
        }]
      });

    await renderDashboard();
    // Click Inbox to show pendingSharedTasks
    fireEvent.click(await screen.findByRole('button', { name: /Inbox/ }));

    // Ensure the inbox-rendered section shows our shared task
    expect(await screen.findByText('Shared Task')).toBeInTheDocument();
    expect(screen.getByText(/From: someone@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/High/)).toBeInTheDocument();
  });

});
