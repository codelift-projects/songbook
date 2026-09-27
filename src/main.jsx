import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { SongProvider } from './store/SongContext';
import { SettingsProvider } from './store/SettingsContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <SettingsProvider>
        <SongProvider>
          <App />
        </SongProvider>
      </SettingsProvider>
    </HashRouter>
  </React.StrictMode>
);
