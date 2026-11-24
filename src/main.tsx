import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { AuthProvider } from './contexts/AuthContext';

import './theme/variables.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('No se encontró el elemento root.');
}

createRoot(container).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);