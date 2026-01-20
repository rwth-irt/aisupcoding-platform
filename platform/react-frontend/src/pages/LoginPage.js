import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios'; 

// Use the environment variable if available (must start with REACT_APP_ for CRA), 
// otherwise fallback to the local server port defined in server.js (5001).
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Append the specific login endpoint to the base URL
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username: username.toLowerCase(),
        password: password
      });

      // Login successful!
      // 1. Store the token in local storage
      localStorage.setItem('token', response.data.token);

      // 2. Redirect to the dashboard page
      navigate('/dashboard');

    } catch (err) {
        if (err.response && (err.response.status === 400 || err.response.status === 403)) {
            // Display the specific message from the backend
            setError(err.response.data.message || 'An error occurred.');
        } else {
            setError('Login failed. Please check your connection and try again.');
        }
        console.error('Login error:', err);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="field-group">
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="field-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" className="save-button">Login</button>
      </form>
      <p style={{ marginTop: '15px' }}>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
}

export default LoginPage;