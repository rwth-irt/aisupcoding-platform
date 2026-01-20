// src/pages/TemplateEditor.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api'; 

function TemplateEditor() {
  const [templateList, setTemplateList] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [status, setStatus] = useState('Please select a template to load.');

  useEffect(() => {
    const fetchTemplateList = async () => {
      try {
        const res = await api.get('/prompt-templates/list');
        setTemplateList(res.data);
        if (res.data.length > 0) {
        } else {
          setStatus('No prompt templates found in the database.');
        }
      } catch (err) {
        console.error('Error fetching template list:', err);
        setStatus('Error loading template list.');
      }
    };
    fetchTemplateList();
  }, []); 

  useEffect(() => {
    if (!selectedTemplateId) {
      setTemplateContent('');
      setStatus('Please select a template to load.');
      return;
    }

    const fetchTemplate = async () => {
      setStatus('Loading template...');
      try {
        const res = await api.get(`/prompt-template/${selectedTemplateId}`);
        setTemplateContent(res.data.Template);
        setStatus(`Loaded Template ID: ${selectedTemplateId}`);
      } catch (err) {
        console.error('Error fetching template:', err);
        setStatus(`Error loading template ${selectedTemplateId}.`);
      }
    };
    fetchTemplate();
  }, [selectedTemplateId]); 

  const handleSave = async () => {
    if (!selectedTemplateId) {
      setStatus('No template selected to save.');
      return;
    }
    setStatus('Saving...');
    try {
      await api.put(`/prompt-template/${selectedTemplateId}`, {
        Template: templateContent 
      });
      setStatus('Save successful!');
    } catch (err) {
      console.error('Error saving template:', err);
      setStatus('Error saving template. Please try again.');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Prompt Template Editor</h2>
        <Link to="/dashboard" className="neutral-button">
          Back to Dashboard
        </Link>
      </div>
      <div className="control-section">
        <div className="field-group">
          <label htmlFor="template-select">Select Template:</label>
          <select
            id="template-select"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            style={{ width: '100%', padding: '8px', fontSize: '1rem' }}
          >
            <option value="">-- Select a Template --</option>
            {templateList.map((template) => (
              <option key={template._id} value={template.TemplateId}>
                Template {template.TemplateId}
              </option>
            ))}
          </select>
        </div>
        <p><strong>Status:</strong> {status}</p>
      </div>

      <div className="field-group">
        <label htmlFor="template-content">Template Content:</label>
        <textarea
          id="template-content"
          rows="25"
          value={templateContent}
          onChange={(e) => setTemplateContent(e.target.value)}
          disabled={!selectedTemplateId} 
          style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}
        />
      </div>

      <button
        className="save-button"
        onClick={handleSave}
        disabled={!selectedTemplateId}
      >
        Save Template
      </button>
    </div>
  );
}

export default TemplateEditor;