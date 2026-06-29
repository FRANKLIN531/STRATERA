import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CheckInKiosk } from './pages/CheckInKiosk';
import '@stratera/shared/styles.css';

const isCheckInRoute =
  window.location.pathname === '/check-in' ||
  window.location.pathname.startsWith('/check-in/');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isCheckInRoute ? <CheckInKiosk /> : <App />}
  </React.StrictMode>,
);
