// src/pages/PromptEditor.js

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import ReactMarkdown from 'react-markdown';
import EditModal from '../components/EditModal'; 

const ReadOnlyField = ({ label, value }) => {
  return (
    <div className="readonly-field">
      {label && <label>{label}:</label>}
      <div className="markdown-preview">
        <ReactMarkdown>{value || ''}</ReactMarkdown>
      </div>
    </div>
  );
};

const EditButton = ({ fieldName, onClick }) => (
  <button 
    className="save-button" 
    onClick={onClick}
    style={{ 
      width: '100%', 
      marginBottom: '10px', 
      textAlign: 'left',
      backgroundColor: '#407fb7' 
    }}
  >
    Edit {fieldName}
  </button>
);


function PromptEditor() {
  const [promptList, setPromptList] = useState([]);
  const [templateList, setTemplateList] = useState([]); 
  
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [currentPromptData, setCurrentPromptData] = useState(null);
  const [currentTemplateData, setCurrentTemplateData] = useState(null);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState(1); 

  const [newTaskId, setNewTaskId] = useState('');
  const [status, setStatus] = useState('Please select a prompt to edit or create a new one.');
  const navigate = useNavigate();

  // --- STATE FOR THE MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null); 

  // --- HELPER & API FUNCTIONS (Wrapped in useCallback) ---

  // Wrapped in useCallback to provide a stable reference for fetchPromptList
  const handleApiError = useCallback((error, context) => {
    console.error(`Error during ${context}:`, error);
    if (error.response) {
        setStatus(`Error: ${error.response.data.message || error.message}`);
    } else {
      setStatus('An unknown error occurred.');
    }
  }, []);

  // Wrapped in useCallback to fix useEffect dependency warning
  const fetchPromptList = useCallback(async () => {
    try {
      const response = await api.get('/prompts/list');
      setPromptList(response.data);
    } catch (error) {
      handleApiError(error, 'fetch list');
    }
  }, [handleApiError]);

  // Wrapped in useCallback to fix useEffect dependency warning
  const fetchTemplateList = useCallback(async () => {
    try {
      const response = await api.get('/prompt-templates/list');
      setTemplateList(response.data);
    } catch (error) {
      console.error('Error fetching template list', error);
    }
  }, []);

  // --- USE EFFECTS ---

  useEffect(() => {
    fetchPromptList();
    fetchTemplateList(); 
  }, [fetchPromptList, fetchTemplateList]); // Dependencies now included safely

  // --- OTHER API FUNCTIONS ---

  const fetchTemplate = async (id) => {
    try {
      const templateResponse = await api.get(`/prompt-template/${id}`);
      setCurrentTemplateData(templateResponse.data);
    } catch (error) {
      console.warn(`Could not fetch Prompt Template with ID ${id}.`);
      handleApiError(error, 'fetch template');
      setCurrentTemplateData(null);
    }
  };

  const fetchPromptData = async (identifier) => {
    try {
      const response = await api.get(`/prompt/${identifier}`);
      setCurrentPromptData(response.data);
      return response.data;
    } catch (error) {
      handleApiError(error, 'fetch prompt data');
      return null;
    }
  };

  // --- EVENT HANDLERS ---

  const handleSelectChange = async (e) => {
    const newSelectedId = e.target.value;
    setSelectedTaskId(newSelectedId);
    setCurrentPromptData(null);
    setCurrentTemplateData(null);

    if (newSelectedId) {
      setStatus('Loading prompt data...');
      const data = await fetchPromptData(newSelectedId); 
      if (data) {
        const templateIdToLoad = data.TemplateId || 1;
        setSelectedTemplateId(templateIdToLoad);
        
        setStatus('Data loaded. Fetching template...');
        await fetchTemplate(templateIdToLoad);
        setStatus('Editable prompt and template loaded.');
      } else {
        setStatus('Error loading editable prompt.');
      }
    } else {
      setStatus('Please select a prompt to edit or create a new one.');
    }
  };

  const handleTemplateChange = async (e) => {
    const newTemplateId = parseInt(e.target.value);
    setSelectedTemplateId(newTemplateId);

    await fetchTemplate(newTemplateId);

    if (currentPromptData) {
        try {
            await api.put(`/prompt/${currentPromptData.TaskIdentifier}`, {
                TemplateId: newTemplateId
            });
            setCurrentPromptData(prev => ({...prev, TemplateId: newTemplateId}));
            setStatus(`Switched to Template ${newTemplateId} and saved choice.`);
        } catch (err) {
            handleApiError(err, 'save template choice');
        }
    }
  };

  const handleCreateNew = async (e) => {
    e.preventDefault();
    if (!newTaskId) {
      setStatus('Please enter a TaskIdentifier to create.');
      return;
    }
    setStatus('Creating new prompt...');
    try {
      const response = await api.post('/prompts', { TaskIdentifier: newTaskId });
      await fetchPromptList();
      setSelectedTaskId(response.data.TaskIdentifier);
      setCurrentPromptData(response.data);
      setNewTaskId('');
      
      setSelectedTemplateId(1);
      await fetchTemplate(1);
      
      setStatus('New prompt created and loaded.');
    } catch (error) {
      handleApiError(error, 'create new');
    }
  };

  const handleOpenModal = (fieldName) => {
    setEditingField(fieldName);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingField(null);
  };
  const handleSaveModal = async (newContent) => {
    if (!editingField || !currentPromptData) return;
    const fieldName = editingField;
    const newPromptData = { ...currentPromptData, [fieldName]: newContent };
    setCurrentPromptData(newPromptData); 
    handleCloseModal();
    setStatus('Saving...');
    try {
      await api.put(
        `/prompt/${currentPromptData.TaskIdentifier}`, 
        { [fieldName]: newContent } 
      );
      setStatus('Save successful!');
    } catch (error) {
      handleApiError(error, 'save field');
      fetchPromptData(currentPromptData.TaskIdentifier); 
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentPromptData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSaveAcceptedLoss = async () => {
    if (!currentPromptData) return;
    setStatus('Saving AcceptedLoss...');
    try {
      await api.put(
        `/prompt/${currentPromptData.TaskIdentifier}`,
        { AcceptedLoss: currentPromptData.AcceptedLoss }
      );
      setStatus('AcceptedLoss saved successfully!');
    } catch (error) {
      handleApiError(error, 'save accepted loss');
      fetchPromptData(currentPromptData.TaskIdentifier);
    }
  };

  // --- TEMPLATE PROCESSING ---

  let processedTemplate = '';
  if (currentTemplateData && currentTemplateData.Template) {
    if (currentPromptData) {
      processedTemplate = currentTemplateData.Template
        .replace(/#ExerciseContext/g, currentPromptData.ExerciseContext || '')
        .replace(/#ProblemDescription/g, currentPromptData.ProblemDescription || '')
        .replace(/#ExerciseTemplate/g, currentPromptData.ExerciseTemplate || '')
        .replace(/#SampleSolution/g, currentPromptData.SampleSolution || '')
        .replace(/#AdditionalInformation/g, currentPromptData.AdditionalInformation || '')
        .replace(/#AdditionalRules/g, currentPromptData.AdditionalRules || '')
        .replace(/#AcceptedLoss/g, currentPromptData.AcceptedLoss || 0.0);
    } else {
      processedTemplate = currentTemplateData.Template;
    }
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Prompt Editor</h2>
        <button onClick={() => navigate('/dashboard')} className="neutral-button">
          Back to Dashboard
        </button>
      </div>

      <p><strong>Status:</strong> {status}</p>

      <div className="split-container">
        <div className="left-pane">
          {currentPromptData ? (
            <div className="editor-buttons">
              <h3>Editing: {currentPromptData.TaskIdentifier}</h3>
              <EditButton fieldName="ProblemDescription" onClick={() => handleOpenModal('ProblemDescription')} />
              <EditButton fieldName="ExerciseContext" onClick={() => handleOpenModal('ExerciseContext')} />
              <EditButton fieldName="ExerciseTemplate" onClick={() => handleOpenModal('ExerciseTemplate')} />
              <EditButton fieldName="SampleSolution" onClick={() => handleOpenModal('SampleSolution')} />
              <EditButton fieldName="AdditionalInformation" onClick={() => handleOpenModal('AdditionalInformation')} />
              <EditButton fieldName="AdditionalRules" onClick={() => handleOpenModal('AdditionalRules')} />
            </div>
          ) : (
            <div className="control-section">
                <p>Please select or create a prompt to begin editing.</p>
            </div>
          )}
        </div>

        <div className="right-pane">
          <div className="right-pane-controls">
            
            <div className="control-section">
              <h3>Create New</h3>
              <form onSubmit={handleCreateNew} style={{ display: 'flex', gap: '5px' }}>
                <input
                  type="text"
                  placeholder="ID"
                  value={newTaskId}
                  onChange={(e) => setNewTaskId(e.target.value)}
                  style={{ flex: 1, minWidth: '0' }}
                />
                <button type="submit" className="save-button" style={{ backgroundColor: '#00549f', padding: '8px 10px' }}>
                  Create
                </button>
              </form>
            </div>

            <div className="control-section">
              <h3>Select Prompt</h3>
              <select value={selectedTaskId} onChange={handleSelectChange} style={{ width: '100%', padding: '8px' }}>
                <option value="">-- Select --</option>
                {promptList.map((prompt) => (
                  <option key={prompt._id} value={prompt.TaskIdentifier}>
                    {prompt.TaskIdentifier}
                  </option>
                ))}
              </select>
            </div>

            <div className="control-section">
              <h3>Template</h3>
              <select 
                value={selectedTemplateId} 
                onChange={handleTemplateChange} 
                disabled={!currentPromptData} 
                style={{ width: '100%', padding: '8px' }}
              >
                {templateList.map((t) => (
                  <option key={t._id} value={t.TemplateId}>
                    Template {t.TemplateId}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <hr style={{ margin: '20px 0', width: '100%' }} />

          <h3>Rendered Text</h3>
          {currentTemplateData ? (
            <div className="readonly-form">
              <ReadOnlyField value={processedTemplate} />
            </div>
          ) : (
            <p>{selectedTaskId ? 'No template found.' : 'Select a prompt to view its template.'}</p>
          )}

          {currentPromptData && selectedTemplateId !== 2 && (
            <div className="accepted-loss-field control-section">
                <div className="field-group">
                    <label htmlFor="AcceptedLoss">AcceptedLoss:</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            id="AcceptedLoss"
                            name="AcceptedLoss"
                            value={currentPromptData.AcceptedLoss === null ? '' : currentPromptData.AcceptedLoss}
                            onChange={handleChange}
                            placeholder="e.g., 0.05"
                            style={{ flex: 1 }}
                        />
                        <button 
                            className="save-button" 
                            onClick={handleSaveAcceptedLoss}
                            style={{ backgroundColor: '#00549f' }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>

      <EditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveModal}
        title={`Edit ${editingField}`}
        initialContent={currentPromptData?.[editingField] || ''}
      />
    </div>
  );
}

export default PromptEditor;