import React from 'react';
import { Toaster as ShadcnToaster } from 'sonner';

export function Toaster() {
  return (
    <ShadcnToaster 
      position="top-right"
      richColors
      closeButton
      theme="light"
    />
  );
} 