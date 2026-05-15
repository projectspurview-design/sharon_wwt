import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation
} from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Inventory from './pages/Inventory';
import DOA from './pages/DOA';

// Professional Loading Spinner Component
function LoadingSpinner() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)'
      }}
    >
      <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 24 }}>
        {/* Outer rotating ring */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          style={{
            position: 'absolute',
            animation: 'spin 2s linear infinite'
          }}
        >
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2"
          />
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            stroke="#1e40af"
            strokeWidth="2"
            strokeDasharray="55 165"
            strokeLinecap="round"
          />
        </svg>

        {/* Inner rotating ring (opposite direction) */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          style={{
            position: 'absolute',
            animation: 'spinReverse 3s linear infinite'
          }}
        >
          <circle
            cx="40"
            cy="40"
            r="25"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="1.5"
          />
          <circle
            cx="40"
            cy="40"
            r="25"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeDasharray="39 78"
            strokeLinecap="round"
          />
        </svg>

        {/* Center dot */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#1e40af',
              opacity: 0.8
            }}
          />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: '#0f172a',
            letterSpacing: '-0.3px'
          }}
        >
          Loading Dashboard
        </p>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: 12,
            color: '#64748b',
            fontWeight: 500
          }}
        >
          Please wait while we fetch your data...
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spinReverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
      `}</style>
    </div>
  );
}

function NavTabs() {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/reports', label: 'Unloading', icon: 'reports' },
    { path: '/inventory', label: 'Inventory', icon: 'inventory' },
    { path: '/doa', label: 'DOA', icon: 'doa' }
  ];

  const getIcon = (iconType) => {
    const iconProps = {
      width: '20',
      height: '20',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2.5',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      viewBox: '0 0 24 24'
    };

    const icons = {
      dashboard: (
        <svg {...iconProps}>
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-7" />
        </svg>
      ),
      reports: (
        <svg {...iconProps}>
          <path d="M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
          <path d="M8 15h5" />
        </svg>
      ),
      inventory: (
        <svg {...iconProps}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M7 8h10" />
          <path d="M7 12h10" />
          <path d="M7 16h6" />
        </svg>
      ),
      doa: (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      )
    };

    return icons[iconType];
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100vw',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        padding: 0,
        margin: 0
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '64px',
          padding: '0 32px',
          width: '100%',
          gap: '16px'
        }}
      >
        {/* Logo */}
        <Link
          to="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            flexShrink: 0,
            paddingRight: '16px',
            borderRight: '1px solid #e2e8f0'
          }}
        >
          {/* Logo SVG */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Server/Datacenter icon */}
            <rect x="4" y="4" width="24" height="24" rx="2" stroke="#1e40af" strokeWidth="1.5" fill="none"/>
            
            {/* Top server */}
            <rect x="6" y="6" width="20" height="5" rx="1" stroke="#1e40af" strokeWidth="1.2" fill="none"/>
            <circle cx="10" cy="8.5" r="1" fill="#1e40af"/>
            <circle cx="22" cy="8.5" r="1" fill="#1e40af"/>
            
            {/* Middle indicator lines */}
            <line x1="6" y1="14" x2="26" y2="14" stroke="#1e40af" strokeWidth="1" opacity="0.6"/>
            <line x1="6" y1="18" x2="26" y2="18" stroke="#1e40af" strokeWidth="1" opacity="0.6"/>
            
            {/* Bottom server */}
            <rect x="6" y="21" width="20" height="5" rx="1" stroke="#1e40af" strokeWidth="1.2" fill="none"/>
            <circle cx="10" cy="23.5" r="1" fill="#1e40af"/>
            <circle cx="22" cy="23.5" r="1" fill="#1e40af"/>
          </svg>

          <span
            style={{
              fontSize: '14px',
              fontWeight: '800',
              color: '#1e40af',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.5px'
            }}
          >
            DIMS
          </span>
        </Link>

        {/* Navigation Tabs */}
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 24px',
              textDecoration: 'none',
              color: isActive(item.path) ? '#1e40af' : '#64748b',
              fontWeight: isActive(item.path) ? '700' : '500',
              fontSize: '14px',
              position: 'relative',
              transition: 'all 0.2s ease',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              flex: 1,
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#475569';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'inherit'
              }}
            >
              {getIcon(item.icon)}
            </span>

            <span>{item.label}</span>

            {/* Active tab underline */}
            {isActive(item.path) && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  left: '0',
                  right: '0',
                  height: '3px',
                  background: '#1e40af',
                  borderRadius: '3px 3px 0 0',
                  animation: 'slideInUnderline 0.25s ease forwards'
                }}
              />
            )}
          </Link>
        ))}
      </div>

      <style>{`
        @keyframes slideInUnderline {
          from {
            width: 0;
            opacity: 0;
          }
          to {
            width: 100%;
            opacity: 1;
          }
        }
      `}</style>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <NavTabs />

      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/doa" element={<DOA />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export { LoadingSpinner };
export default App;