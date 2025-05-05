import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './Login';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'mockedUID', email: 'test@example.com' }
  })),
  signInWithEmailAndPassword: jest.fn()
}));

// Mock Firebase Firestore 
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


describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful login mock
    signInWithEmailAndPassword.mockResolvedValue({ 
      user: { uid: 'mockedUID', email: 'test@example.com' } 
    });
    
    // Default document doesn't exist
    getDoc.mockImplementation(async () => ({
      exists: () => false,
      data: () => null
    }));
    
    setDoc.mockResolvedValue();

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/signup" element={<div>Sign Up Page</div>} />
          <Route path="/forgot-password" element={<div>Forgot Password Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  });

  test('renders login form with email and password fields', () => {
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('updates form fields when user types', () => {
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'securepassword' } });

    expect(emailInput.value).toBe('user@example.com');
    expect(passwordInput.value).toBe('securepassword');
  });

  test('shows loading state during form submission', async () => {
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toHaveTextContent(/signing in/i);
    });
  });

  test('successful login navigates to dashboard', async () => {
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'securepassword' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(), 
        'user@example.com', 
        'securepassword'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('skips document creation if user exists', async () => {
    getDoc.mockImplementation(async () => ({
      exists: () => true,
      data: () => ({ email: 'existing@user.com' })
    }));

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(getDoc).toHaveBeenCalled();
      expect(setDoc).not.toHaveBeenCalled();
    });
  });

  test('displays specific error for invalid email', async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-email' });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  test('displays specific error for wrong password', async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/wrong-password' });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });
  test.each([
    ['auth/user-not-found', /invalid email or password/i],
    ['auth/too-many-requests', /too many attempts/i],
    ['auth/network-request-failed', /network error/i],
    ['unknown-error', /login failed/i],
  ])('displays correct message for %s error code', async (code, expectedMessage) => {
    signInWithEmailAndPassword.mockRejectedValue({ code });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(expectedMessage)).toBeInTheDocument();
    });
  });
 
  test('does not show error message when there is no error', () => {
    // Ensure that no error message is shown when the error state is empty
    expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
  });

  test('renders "Forgot Password" link with correct href', () => {
    expect(screen.getByRole('link', { name: /forgot password/i }))
      .toHaveAttribute('href', '/forgot-password');
  });
  
  test('renders "Sign Up" link with correct href', () => {
    expect(screen.getByRole('link', { name: /sign up/i }))
      .toHaveAttribute('href', '/signup');
  });

  test('logs error when user document creation fails', async () => {
    // Mock a Firestore error
    const mockError = new Error('Firestore error');
    getDoc.mockRejectedValueOnce(mockError);
  
    // Mock console.error to track calls
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  
    // Trigger the function that will call createUserDocument
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
  
    await waitFor(() => {
      // Verify the error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error creating user document:',
        mockError
      );
    });
  
    // Clean up the mock
    consoleSpy.mockRestore();
  });
  
  test('skips user document creation if user is null', async () => {
    // Mock successful login but `auth.currentUser` returns null
    signInWithEmailAndPassword.mockResolvedValue({});
    
    // Override the `auth.currentUser` to null
    const { auth } = require('../firebase');
    auth.currentUser = null;
  
    // Spy on Firestore functions
    const setDocSpy = jest.spyOn(require('firebase/firestore'), 'setDoc');
    const getDocSpy = jest.spyOn(require('firebase/firestore'), 'getDoc');
  
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'nulluser@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'somepassword' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
  
    await waitFor(() => {
      expect(setDocSpy).not.toHaveBeenCalled();
      expect(getDocSpy).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
  
  
});