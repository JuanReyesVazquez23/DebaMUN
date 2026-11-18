import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { LoadingBlock } from './components/StateBlocks';
import { ColorSchemeProvider } from './lib/color-scheme';
import { SessionProvider, useSession } from './lib/session';
import { CommitteePage } from './pages/CommitteePage';
import { CountryPage } from './pages/CountryPage';
import { DashboardPage } from './pages/DashboardPage';
import { DebatePage } from './pages/DebatePage';
import { DossierPage } from './pages/DossierPage';
import { GradePage } from './pages/GradePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ResearchPage } from './pages/ResearchPage';
import { WelcomePage } from './pages/WelcomePage';

function HomeRedirect() {
  const { status, profile } = useSession();
  if (status === 'loading') return <LoadingBlock label="Abriendo DebaMun…" />;
  return <Navigate to={profile ? '/app' : '/bienvenida'} replace />;
}

function Protected({ children }: { children: ReactNode }) {
  const { status, profile } = useSession();
  if (status === 'loading') return <LoadingBlock label="Abriendo tu mesa…" />;
  if (!profile) return <Navigate to="/bienvenida" replace />;
  return <AppShell>{children}</AppShell>;
}

function Onboarding({ children }: { children: ReactNode }) {
  const { status, profile } = useSession();
  if (status === 'loading') return <LoadingBlock label="Abriendo DebaMun…" />;
  if (profile) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <ColorSchemeProvider>
      <SessionProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route
            path="/bienvenida"
            element={
              <Onboarding>
                <WelcomePage />
              </Onboarding>
            }
          />
          <Route
            path="/grado"
            element={
              <Onboarding>
                <GradePage />
              </Onboarding>
            }
          />
          <Route
            path="/pais"
            element={
              <Onboarding>
                <CountryPage />
              </Onboarding>
            }
          />
          <Route
            path="/comision"
            element={
              <Onboarding>
                <CommitteePage />
              </Onboarding>
            }
          />
          <Route
            path="/app"
            element={
              <Protected>
                <DashboardPage />
              </Protected>
            }
          />
          <Route
            path="/app/dossier"
            element={
              <Protected>
                <DossierPage />
              </Protected>
            }
          />
          <Route
            path="/app/debate"
            element={
              <Protected>
                <DebatePage />
              </Protected>
            }
          />
          <Route
            path="/app/investigacion"
            element={
              <Protected>
                <ResearchPage />
              </Protected>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SessionProvider>
    </ColorSchemeProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
