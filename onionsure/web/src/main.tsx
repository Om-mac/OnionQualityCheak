import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './components/Toast';
import { InspectionProvider } from './context/InspectionContext';
import { LiveActivity } from './components/RealtimeStatus';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <InspectionProvider>
          <ToastProvider>
            <LiveActivity />
            <App />
          </ToastProvider>
        </InspectionProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
