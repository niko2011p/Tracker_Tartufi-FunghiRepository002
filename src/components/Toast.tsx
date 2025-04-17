import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import ReactDOM from 'react-dom';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ 
  id, 
  title, 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div 
      className={`toast toast-${type}`}
      role="alert"
    >
      <div className="toast-icon">
        {getIcon()}
      </div>
      <div className="toast-content">
        <div className="toast-title">{title}</div>
        {message && <div className="toast-message">{message}</div>}
      </div>
      <button 
        onClick={() => onClose(id)} 
        className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Toast container to render toasts
interface ToastContainerProps {
  toasts: ToastProps[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return ReactDOM.createPortal(
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 flex flex-col items-center space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={removeToast} />
        </div>
      ))}
    </div>,
    document.body
  );
};

// Toast hook to use throughout the app
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (props: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = String(Date.now());
    setToasts(prev => [...prev, { ...props, id, onClose: removeToast }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const toast = {
    success: (title: string, message?: string, duration?: number) => 
      addToast({ title, message, type: 'success', duration }),
    error: (title: string, message?: string, duration?: number) => 
      addToast({ title, message, type: 'error', duration }),
    info: (title: string, message?: string, duration?: number) => 
      addToast({ title, message, type: 'info', duration }),
    warning: (title: string, message?: string, duration?: number) => 
      addToast({ title, message, type: 'warning', duration }),
  };

  const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <>
        {children}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  };

  return { toast, ToastProvider };
};

export default useToast; 