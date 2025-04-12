import React, { useState, useEffect } from 'react';
import { Moon, Sun, Map as MapIcon, Bell, Share2, Database, HelpCircle, User } from 'lucide-react';
import { useMapStore } from '../store/mapStore';
import { testWeatherApiKey } from '../utils/weatherApiTest';
import MapLogo from './MapLogo';
import { Link } from 'react-router-dom';
import { readVersion } from '../utils/versionReader';

export default function Settings() {
  const [weatherApiStatus, setWeatherApiStatus] = useState<{ isValid: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [version, setVersion] = useState('0.0.0');

  useEffect(() => {
    const loadVersion = async () => {
      const v = await readVersion();
      setVersion(v);
    };
    loadVersion();
  }, []);

  const handleTestWeatherApi = async () => {
    setIsLoading(true);
    const apiKey = import.meta.env.VITE_WEATHERAPI_KEY;
    const result = await testWeatherApiKey(apiKey);
    setWeatherApiStatus(result);
    setIsLoading(false);
  };

  return (
    <div data-page="settings" className="min-h-screen bg-gray-50">
      <MapLogo />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6 mt-32">Impostazioni</h2>
        
        <div className="space-y-6">
          <section className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-4">Profilo</h3>
            <div className="space-y-4">
              <Link to="/profile" className="flex items-center text-gray-700 hover:text-gray-900">
                <User className="w-5 h-5 mr-3" />
                <span>Gestione profilo utente</span>
              </Link>
            </div>
          </section>

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
                  <span>Modalità mappa</span>
                </div>
                <select 
                  className="rounded-md border-gray-300 shadow-sm"
                  value={useMapStore().mapMode}
                  onChange={(e) => useMapStore.getState().setMapMode(e.target.value as 'online' | 'offline' | 'green')}
                >
                  <option value="online">Online (OpenTopoMap)</option>
                  <option value="offline">Offline (Tile locali)</option>
                  <option value="green">Sfondo verde</option>
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#8eaa36]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8eaa36]"></div>
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
            <h3 className="text-lg font-semibold mb-4">Test API Meteo</h3>
            <div className="space-y-4">
              <div className="mb-4">
                <h4 className="text-md font-medium mb-2">WeatherAPI</h4>
                <p className="text-sm text-gray-600 mb-2">Verifica la validità della tua chiave API WeatherAPI</p>
                <button
                  onClick={handleTestWeatherApi}
                  disabled={isLoading}
                  className="flex items-center text-gray-700 hover:text-gray-900 bg-[#fd9a3c]/10 px-4 py-2 rounded-md disabled:opacity-50"
                >
                  <span>{isLoading ? 'Verifica in corso...' : 'Verifica API WeatherAPI'}</span>
                </button>

                {weatherApiStatus && (
                  <div className={`mt-3 p-3 rounded ${weatherApiStatus.isValid ? 'bg-[#8eaa36]/10 text-[#8eaa36]/90' : 'bg-red-100 text-red-800'}`}>
                    {weatherApiStatus.message}
                  </div>
                )}
                
                {weatherApiStatus?.isValid && (
                  <div className="mt-2 text-sm text-gray-600">
                    {weatherApiStatus?.isValid ? (
                      <p>La tua chiave API è valida e funzionante. Puoi utilizzare tutte le funzionalità meteo dell'app.</p>
                    ) : (
                      <div>
                        <p className="font-medium mb-1">Suggerimenti per risolvere il problema:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Verifica che la chiave API nel file .env sia corretta e aggiornata</li>
                          <li>Assicurati che il tuo account WeatherAPI sia attivo</li>
                          <li>Controlla di non aver superato il limite di richieste giornaliere</li>
                          <li>Se il problema persiste, prova a generare una nuova chiave API su WeatherAPI.com</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-4 flex flex-col items-center space-y-2">
                  <a href="https://www.weatherapi.com/" title="Free Weather API" className="text-[#fd9a3c] hover:text-[#e88a2c]">
                    Powered by WeatherAPI.com
                  </a>
                  <a href="https://www.weatherapi.com/" title="Free Weather API">
                    <img src="//cdn.weatherapi.com/v4/images/weatherapi_logo.png" alt="Weather data by WeatherAPI.com" className="h-8" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-4">Aiuto</h3>
            <div className="space-y-4">
              <button className="flex items-center text-gray-700 hover:text-gray-900">
                <HelpCircle className="w-5 h-5 mr-3" />
                <span>Tutorial</span>
              </button>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">Versione {version}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}