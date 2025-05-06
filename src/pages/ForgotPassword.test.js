import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import ForgotPassword from '../pages/ForgotPassword';

// Mock Firebase Auth and Firestore
jest.mock('../firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user' },
    onAuthStateChanged: jest.fn()
  },
  db: {} // Mock db object
}));

// Import the mock function before using it
import { sendPasswordResetEmail } from 'firebase/auth';

// Mock Firebase auth functions
jest.mock('firebase/auth', () => ({
  ...jest.requireActual('firebase/auth'),
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'test-user' }
  })),
  sendPasswordResetEmail: jest.fn()
}));

// Mock Firestore functions (even though not used, to prevent import errors)
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  getFirestore: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn()
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('ForgotPassword Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendPasswordResetEmail.mockResolvedValue(); // Reset mock implementation
  });

  it('should render the forgot password form', () => {
    render(
      <Router>
        <ForgotPassword />
      </Router>
    );

    expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
    expect(screen.getByText('Send Reset Link')).toBeInTheDocument();
  });

  it('should show error for invalid email submission', async () => {
    sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/invalid-email' });

    render(
      <Router>
        <ForgotPassword />
      </Router>
    );

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'invalid-email' }
    });
    fireEvent.click(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    });
  });

  it('should show error when user not found', async () => {
    sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' });

    render(
      <Router>
        <ForgotPassword />
      </Router>
    );

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'nonexistent@user.com' }
    });
    fireEvent.click(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      expect(screen.getByText('No account found with this email.')).toBeInTheDocument();
    });
  });

  it('should show generic error on failure', async () => {
    sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/unknown-error' });

    render(
      <Router>
        <ForgotPassword />
      </Router>
    );

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'valid@email.com' }
    });
    fireEvent.click(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      expect(screen.getByText('Password reset failed. Please try again.')).toBeInTheDocument();
    });
  });

  it('should show success message on successful submission', async () => {
    sendPasswordResetEmail.mockResolvedValueOnce();

    render(
      <Router>
        <ForgotPassword />
      </Router>
    );

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'valid@user.com' }
    });
    fireEvent.click(screen.getByText('Send Reset Link'));

    await waitFor(() => {
      expect(screen.getByText('Password reset email sent! Check your inbox.')).toBeInTheDocument();
      expect(screen.getByText('Return to Login')).toBeInTheDocument();
    });
  });

  it('should navigate to login when return link is clicked', async () => {
    sendPasswordResetEmail.mockResolvedValueOnce();

    render(
      <Router>
        <ForgotPassword />
      </Router>
    );

    // First complete a successful submission
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'valid@user.com' }
    });
    fireEvent.click(screen.getByText('Send Reset Link'));

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText('Return to Login')).toBeInTheDocument();
    });

    // Click the return link
    fireEvent.click(screen.getByText('Return to Login'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should show loading state during submission', async () => {
    sendPasswordResetEmail.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 500))
    );

    render(
      <Router>
        <ForgotPassword />
      </Router>
    );

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'valid@user.com' }
    });
    fireEvent.click(screen.getByText('Send Reset Link'));

    expect(screen.getByText('Sending...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Sending...')).not.toBeInTheDocument();
    });
  });
});