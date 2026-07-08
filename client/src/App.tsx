import { Routes, Route, Navigate, useLocation, matchPath } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Header } from './components/layout/Header';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Editor } from './pages/Editor';
import { Projects } from './pages/Projects';
import { RenderView } from './pages/RenderView';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const location = useLocation();
  const isRenderPage = location.pathname === '/render';
  // The editor renders its own single top bar instead of the global header
  const isEditorPage = matchPath('/editor/:projectId', location.pathname) !== null;

  // Render page is headless - no header
  if (isRenderPage) {
    return <RenderView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-app">
      {!isEditorPage && <Header />}
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
    </div>
  );
}

export default App;
