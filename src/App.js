import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import TaskInput from './pages/TaskInput';
<<<<<<< HEAD
=======
import ForgotPassword from './pages/ForgotPassword';

import 'react-big-calendar/lib/css/react-big-calendar.css';

>>>>>>> mariana-auth

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add-task" element={<TaskInput />} />
<<<<<<< HEAD
=======
        <Route path="/forgot-password" element={<ForgotPassword />} />
     

>>>>>>> mariana-auth
      </Routes>
    </Router>
  );
};

export default App;