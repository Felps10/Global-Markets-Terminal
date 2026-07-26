import { useLocation } from 'react-router-dom';
import PublicFooter from './PublicFooter.jsx';
import GMTPublicHeader from './GMTPublicHeader.jsx';

export default function PublicLayout({ children }) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div data-theme="dark" style={{ minHeight: '100vh', background: '#080f1a', display: 'flex', flexDirection: 'column' }}>
      <GMTPublicHeader isHome={isHome} />
      {/* Header is position:fixed (52px) and occupies no flow height — reserve
          it here on every page except home, whose hero is designed to sit
          under the transparent header. */}
      <main style={{ flex: 1, paddingTop: isHome ? 0 : 52 }}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
