import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import App from './App.tsx'
import LoginScreen from './LoginScreen.tsx'
import { UserProvider } from './contexts/UserContext.tsx'
import { WalletContextProvider } from './contexts/WalletContext.tsx'

function AppWithAuth() {
  const { isLoading, isAuthenticated } = useAuth0();

  if (isLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#00ff00',
        fontFamily: 'Courier New, monospace',
        fontSize: '1.2rem'
      }}>
        Loading...
      </div>
    );
  }

  return isAuthenticated ? (
    <WalletContextProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </WalletContextProvider>
  ) : (
    <LoginScreen />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
    >
      <AppWithAuth />
    </Auth0Provider>
  </StrictMode>,
)
