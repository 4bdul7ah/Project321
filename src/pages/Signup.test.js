import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Signup from './Signup';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
    getAuth: jest.fn(() => ({})),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn()
  }));

// Mock Firebase Firestore (using your improved mock)
jest.mock('firebase/firestore', () => ({
    ...jest.requireActual('firebase/firestore'),
    doc: jest.fn((path, id) => `${path}/${id}`),
    getDoc: jest.fn(),
    setDoc: jest.fn(),
    collection: jest.fn((path) => path),
    Timestamp: {
      fromDate: jest.fn(date => ({ 
        seconds: Math.floor(date.getTime() / 1000),
        toDate: () => date
      }))
    }
  }));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('Signup Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    render(
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
  });

  test('renders all form fields', () => {
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  test('updates email and password fields on input', () => {
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });

    expect(screen.getByLabelText(/email/i).value).toBe('test@example.com');
    expect(screen.getByLabelText(/^password$/i).value).toBe('password123');
    expect(screen.getByLabelText(/confirm password/i).value).toBe('password123');
  });

  test('shows error if passwords do not match', async () => {
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password321' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    });
  });

  test('successful signup navigates to dashboard', async () => {
    createUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'uid123', email: 'test@example.com' }
    });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(), 'test@example.com', 'password123'
      );
      expect(setDoc).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('displays specific error for weak password', async () => {
    createUserWithEmailAndPassword.mockRejectedValue({ code: 'auth/weak-password' });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/password is too weak/i)).toBeInTheDocument();
    });
  });

  test('displays specific error for email already in use', async () => {
    createUserWithEmailAndPassword.mockRejectedValue({ code: 'auth/email-already-in-use' });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'used@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is already in use/i)).toBeInTheDocument();
    });
  });

  test('displays specific error for invalid email', async () => {
    createUserWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-email' });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'invalidemail' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });
  test('skips user document creation if user is null after signup', async () => {
    createUserWithEmailAndPassword.mockResolvedValue({ user: null });
  
    // Spy on Firestore functions
    const setDocSpy = jest.spyOn(require('firebase/firestore'), 'setDoc');
    const getDocSpy = jest.spyOn(require('firebase/firestore'), 'getDoc');
  
    // Fill out and submit form
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), { 
      target: { value: 'password123' } 
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { 
      target: { value: 'password123' } 
    });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
  
    await waitFor(() => {
      // Ensure createUserDocument is called with null user
      expect(setDocSpy).not.toHaveBeenCalled();
      expect(getDocSpy).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  
    setDocSpy.mockRestore();
    getDocSpy.mockRestore();
  });  
});
