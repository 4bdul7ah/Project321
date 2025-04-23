import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../styles/Home.css'; 

const Home = () => {
  return (
    <motion.div 
      className="home-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <header className="hero-section">
        <div className="hero-content">
          <motion.h1 
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 120 }}
          >
            TimeSync
            <span className="tagline">AI-Powered Scheduling Assistant</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Smart scheduling for students balancing classes, work, and life
          </motion.p>
          
          <div className="cta-buttons">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/login" className="primary-button">
                Get Started
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/signup" className="secondary-button">
                Create Account
              </Link>
            </motion.div>
          </div>
        </div>
        
        <div className="hero-image">
          <img 
            src="https://illustrations.popsy.co/amber/digital-nomad.svg" 
            alt="Time management illustration"
          />
        </div>
      </header>

      <section className="features-section">
        <h2>Why TimeSync?</h2>
        <div className="features-grid">
          <motion.div 
            className="feature-card"
            whileHover={{ y: -10 }}
          >
            <div className="icon">⏱️</div>
            <h3>AI Scheduling</h3>
            <p>Automatically prioritizes tasks based on deadlines and your habits</p>
          </motion.div>
          
          <motion.div 
            className="feature-card"
            whileHover={{ y: -10 }}
          >
            <div className="icon">🔄</div>
            <h3>Adaptive Learning</h3>
            <p>Gets smarter the more you use it</p>
          </motion.div>
          
          <motion.div 
            className="feature-card"
            whileHover={{ y: -10 }}
          >
            <div className="icon">📱</div>
            <h3>Cross-Platform</h3>
            <p>Works on all your devices</p>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
};

export default Home;