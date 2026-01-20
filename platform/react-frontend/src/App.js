// src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PromptEditor from './pages/PromptEditor';
import AnalyticsPage from './pages/AnalyticsPage';
import ProjectInfoPage from './pages/ProjectInfoPage'; 
import TemplateEditor from './pages/TemplateEditor';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/dashboard" />} /> 
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Route>

        <Route 
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/editor"
          element={
            <ProtectedRoute>
              <PromptEditor />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/template-editor"
          element={
            <ProtectedRoute>
              <TemplateEditor />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/project-info"
          element={
            <ProtectedRoute>
              <ProjectInfoPage />
              </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;