// src/pages/ProjectInfoPage.js

import React from 'react';
import { Link } from 'react-router-dom';

function ProjectInfoPage() {
  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '50px auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Project Information</h2>
        <Link to="/dashboard" className="neutral-button">
          Back to Dashboard
        </Link>
      </div>
      <div className="pdf-embed-container">
        <embed 
          src="/Poster_KIsupCODING.pdf" 
          type="application/pdf" 
        />
      </div>

    </div>
  );
}

export default ProjectInfoPage;