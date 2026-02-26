import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Header } from './components/layout/Header';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Editor } from './pages/Editor';
import { Projects } from './pages/Projects';
import { RenderView } from './pages/RenderView';
import { ScanLines } from './components/ui/ScanLines';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const location = useLocation();
  const isRenderPage = location.pathname === '/render';

  // Render page is headless - no header or scan lines
  if (isRenderPage) {
    return <RenderView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:projectId"
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <ScanLines intensity="subtle" color="cyan" />
    </div>
  );
}

export default App;
