import { useLocation } from 'react-router-dom';
import PublicFooter from './PublicFooter.jsx';
import { GMTPublicHeader } from './GMTHeader.jsx';

export default function PublicLayout({ children }) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div style={{ minHeight: '100vh', background: '#080f1a', display: 'flex', flexDirection: 'column' }}>
      <GMTPublicHeader isHome={isHome} />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
