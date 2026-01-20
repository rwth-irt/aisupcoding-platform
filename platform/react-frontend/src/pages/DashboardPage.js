// src/pages/DashboardPage.js

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

// --- SVG Icons ---

// Icon for "Prompt Editor"
const IconPromptEditor = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

// Icon for "Template Editor"
const IconTemplateEditor = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="18" x2="12" y2="12"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);

// Icon for "User Analytics"
const IconAnalytics = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

// Icon for "Project Info"
const IconProjectInfo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const IconBuilding = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="3" y1="9" x2="21" y2="9"></line>
    <line x1="9" y1="21" x2="9" y2="9"></line>
    <line x1="15" y1="21" x2="15" y2="9"></line>
  </svg>
);


function DashboardPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="container" style={{ margin: '50px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Dashboard</h2>
        <button 
          onClick={handleLogout} 
          style={{backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer'}}
        >
          Logout
        </button>
      </div>
      <p style={{fontSize: '1.2rem', color: '#333'}}>Welcome to the Dashboard. Please select a tool from the grid to continue.</p>

      <div className="dashboard-grid">
        <Link to="/template-editor" className="dashboard-card link-card">
          <IconTemplateEditor />
          <h3>Template Editor</h3>
        </Link>

        <Link to="/analytics" className="dashboard-card link-card">
          <IconAnalytics />
          <h3>User Analytics</h3>
        </Link>

        <Link to="/project-info" className="dashboard-card link-card">
          <IconProjectInfo />
          <h3>Project Info</h3>
        </Link>
        
        <Link to="/editor" className="dashboard-card link-card">
          <IconPromptEditor />
          <h3>Prompt Editor</h3>
        </Link>
        <a 
          href="https://www.irt.rwth-aachen.de/go/id/iung/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="dashboard-card link-card"
        >
          <IconBuilding />
          <h3>IRT Website</h3>
        </a>

      </div>
    </div>
  );
}

export default DashboardPage;