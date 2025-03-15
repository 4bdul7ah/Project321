import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div style={styles.container}>
      <h1>Welcome to TimeSync</h1>
      <p>Your AI-powered scheduling assistant.</p>
      <div style={styles.buttonContainer}>
        <Link to="/login" style={styles.button}>Login</Link>
        <Link to="/signup" style={styles.button}>Signup</Link>
      </div>
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    marginTop: '50px',
  },
  buttonContainer: {
    marginTop: '20px',
  },
  button: {
    margin: '10px',
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '5px',
  },
};

export default Home;