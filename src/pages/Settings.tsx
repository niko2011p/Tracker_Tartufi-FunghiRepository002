import React from 'react';
import { APP_VERSION } from '../config/version';

const Settings: React.FC = () => {
  return (
    <div className="settings-page">
      {/* ... existing settings content ... */}
      
      <div className="version-info">
        <p className="text-sm text-gray-500">Versione {APP_VERSION}</p>
      </div>
    </div>
  );
};

export default Settings; 