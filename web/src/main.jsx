import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';

import App from './App';
import './styles.css';

const searchParams = new URLSearchParams(window.location.search);
const p = searchParams.get('p');
const q = searchParams.get('q');

if (p) {
  const nextPath = p.replace(/~and~/g, '&');
  const nextQuery = q ? `?${q.replace(/~and~/g, '&')}` : '';
  const nextUrl = `${nextPath}${nextQuery}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
