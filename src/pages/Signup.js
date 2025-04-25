import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import '../styles/Signup.css';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/dashboard'); // Redirect after successful signup
    } catch (err) {
      let friendlyError = 'Signup failed. Please try again.';

      switch (err.code) {
        case 'auth/email-already-in-use':
          friendlyError = 'Email already in use.';
          break;
        case 'auth/invalid-email':
          friendlyError = 'Please enter a valid email.';
          break;
        case 'auth/weak-password':
          friendlyError = 'Password should be at least 6 characters.';
          break;
        default:
          friendlyError = 'An unexpected error occurred.';
          console.error('Signup error:', err); // Log technical errors
      }

      setError(friendlyError);
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="signup-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="signup-card">
        <motion.div
          className="signup-header"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
        >
          <h2>Create Account</h2>
          <p>Join TimeSync to manage your schedule</p>
        </motion.div>

        {error && (
          <motion.div
            className="error-message"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="error-icon">⚠️</div>
            <div>{error}</div>
          </motion.div>
        )}

        <form onSubmit={handleSignup}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength="6"
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <motion.button
            type="submit"
            className="signup-button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </motion.button>
        </form>

        <div className="signup-footer">
          <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
      </div>

      <div className="signup-illustration">
        <img
          src="/images/signup-illustration.svg"
          alt="Signup illustration"
        />
      </div>
    </motion.div>
  );
};

export default Signup;