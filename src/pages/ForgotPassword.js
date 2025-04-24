import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import '../styles/ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err) {
      let friendlyError = "Password reset failed. Please try again.";
      
      switch (err.code) {
        case 'auth/invalid-email':
          friendlyError = "Please enter a valid email address.";
          break;
        case 'auth/user-not-found':
          friendlyError = "No account found with this email.";
          break;
        default:
          console.error("Password reset error:", err);
      }
      
      setError(friendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="forgot-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="forgot-card">
        <motion.div 
          className="forgot-header"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
        >
          <h2>Reset Your Password</h2>
          <p>Enter your email to receive a reset link</p>
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

        {success ? (
          <div className="success-message">
            <p>Password reset email sent! Check your inbox.</p>
            <button 
              onClick={() => navigate('/login')} 
              className="back-button"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
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

            <motion.button
              type="submit"
              className="submit-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </motion.button>
          </form>
        )}

        <div className="forgot-footer">
          <p>Remember your password? <Link to="/login">Login</Link></p>
        </div>
      </div>

      <div className="forgot-illustration">
        <img 
          src="/images/forgot-password.svg" 
          alt="Password reset illustration"
        />
      </div>
    </motion.div>
  );
};

export default ForgotPassword;