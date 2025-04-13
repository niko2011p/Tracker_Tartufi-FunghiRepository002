import React from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';

const MainApp: React.FC = () => {
  return (
    <div>
      {/* Existing code */}
      <Link to="/logger" className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg">
        <History className="w-5 h-5" />
        <span>Logger</span>
      </Link>
      {/* Existing code */}
    </div>
  );
};

export default MainApp; 