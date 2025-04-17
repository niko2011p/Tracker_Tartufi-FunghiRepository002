import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useToast } from './components/Toast';

const { ToastProvider } = useToast();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
