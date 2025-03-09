import React from 'react';
import { Moon, Sun, Map as MapIcon, Bell, Share2, Database, HelpCircle } from 'lucide-react';

export default function Impostazioni() {
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Impostazioni</h2>
      
      <div className="space-y-6">
        <section className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">Aspetto</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Sun className="w-5 h-5 text-gray-500 mr-3" />
                <span>Tema</span>
              </div>
              <select className="rounded-md border-gray-300 shadow-sm">
                <option>Chiaro</option>
                <option>Scuro</option>
                <option>Sistema</option>
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">Mappa</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MapIcon className="w-5 h-5 text-gray-500 mr-3" />
                <span>Stile mappa</span>
              </div>
              <select className="rounded-md border-gray-300 shadow-sm">
                <option>OpenTopoMap</option>
                <option>Satellite</option>
                <option>Stradale</option>
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">Notifiche</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="w-5 h-5 text-gray-500 mr-3" />
                <span>Notifiche push</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">Dati</h3>
          <div className="space-y-4">
            <button className="flex items-center text-gray-700 hover:text-gray-900">
              <Share2 className="w-5 h-5 mr-3" />
              <span>Esporta dati</span>
            </button>
            <button className="flex items-center text-gray-700 hover:text-gray-900">
              <Database className="w-5 h-5 mr-3" />
              <span>Backup automatico</span>
            </button>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">Aiuto</h3>
          <div className="space-y-4">
            <button className="flex items-center text-gray-700 hover:text-gray-900">
              <HelpCircle className="w-5 h-5 mr-3" />
              <span>Tutorial</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}