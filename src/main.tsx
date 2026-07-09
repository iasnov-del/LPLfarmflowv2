import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log("Mounting FarmFlow Pro...");

const container = document.getElementById('root');
if (!container) {
  console.error("Root container not found!");
  document.body.innerHTML = '<h1>Fatal Error: Root container not found</h1>';
} else {
  try {
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    console.log("Root rendered successfully");
  } catch (err) {
    console.error("Mounting error:", err);
    document.body.innerHTML = `<h1>Mounting Error</h1><pre>${err}</pre>`;
  }
}

