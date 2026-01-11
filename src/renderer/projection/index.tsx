import { createRoot } from 'react-dom/client';
import '../shared/i18n'; // Initialize i18n
import '../styles/globals.css';
import App from './App';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);
