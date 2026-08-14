import { createRoot } from 'react-dom/client';
import 'dialkit/styles.css';
import FlagApp from './FlagApp.tsx';

createRoot(document.getElementById('root')!).render(<FlagApp />);
