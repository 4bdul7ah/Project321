import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import '../styles/Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');  // Redirect to dashboard on successful login
    } catch (err) {
      let friendlyError = "Login failed. Please try again.";
      
      switch (err.code) {
        case 'auth/invalid-email':
          friendlyError = "Please enter a valid email address.";
          break;
        case 'auth/user-disabled':
          friendlyError = "This account has been disabled.";
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          friendlyError = "Invalid email or password.";
          break;
        case 'auth/too-many-requests':
          friendlyError = "Too many attempts. Please try again later.";
          break;
        case 'auth/network-request-failed':
          friendlyError = "Network error. Please check your connection.";
          break;
        default:
          console.error("Login error:", err);
      }
      
      setError(friendlyError);
      setIsLoading(false);
    }    
  };

  return (
    <motion.div
      className="login-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="login-card">
        <motion.div 
          className="login-header"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
        >
          <h2>Welcome Back</h2>
          <p>Sign in to manage your schedule</p>
        </motion.div>

        {error && (
          <motion.div 
            className="error-message"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="error-icon">⚠️</div>
            <div>{error}</div>
          </motion.div>
        )}

        <form onSubmit={handleLogin}>
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
            />
          </div>

          <motion.button
            type="submit"
            className="login-button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </motion.button>
        </form>

        <div className="login-footer">
          <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
          <Link to="/forgot-password" className="forgot-password">
            Forgot password?
          </Link>
        </div>
      </div>

      <div className="login-illustration">
        <img 
          src="/images/login-illustration.svg" 
          alt="Login illustration"
        />
      </div>
    </motion.div>
  );
};

export default Login;