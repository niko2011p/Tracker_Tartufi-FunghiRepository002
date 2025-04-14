import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const Profile: React.FC = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Non pulire più il track store
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // In caso di errore, procedi comunque con il logout
      logout();
      navigate('/login');
    }
  };

  if (!user) {
    return <div>Caricamento...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center text-sm font-medium text-green-600 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 rounded-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Indietro
          </button>
          <div className="uppercase tracking-wide text-sm text-green-500 font-semibold">Profilo Utente</div>
          <h2 className="block mt-1 text-lg leading-tight font-medium text-black">Benvenuto, {user.username}</h2>
          <p className="mt-2 text-gray-500">{user.email}</p>
          
          <div className="mt-6">
            <h3 className="text-md font-medium text-gray-900">Informazioni Account</h3>
            <dl className="mt-2 border-t border-b border-gray-200 divide-y divide-gray-200">
              <div className="py-3 flex justify-between text-sm font-medium">
                <dt className="text-gray-500">ID Utente</dt>
                <dd className="text-gray-900">{user.id}</dd>
              </div>
              <div className="py-3 flex justify-between text-sm font-medium">
                <dt className="text-gray-500">Nome Utente</dt>
                <dd className="text-gray-900">{user.username}</dd>
              </div>
              <div className="py-3 flex justify-between text-sm font-medium">
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-900">{user.email}</dd>
              </div>
            </dl>
          </div>
          
          <div className="mt-6">
            <button
              onClick={handleLogout}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;