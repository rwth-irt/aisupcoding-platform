// src/components/EditModal.js

import React, { useState, useEffect } from 'react';

function EditModal({ isOpen, onClose, onSave, title, initialContent }) {
  // Internal state to manage the text being edited
  const [content, setContent] = useState('');

  // When the modal opens, set its internal state to the initial content
  useEffect(() => {
    if (isOpen) {
      setContent(initialContent || '');
    }
  }, [isOpen, initialContent]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(content); // Pass the internal state back to the parent
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{title}</h3>
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="modal-textarea"
        />
        
        <div className="modal-buttons">
          <button 
            onClick={onClose} 
            className="neutral-button"
          >
            Discard
          </button>
          <button 
            onClick={handleSave} 
            className="save-button"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditModal;