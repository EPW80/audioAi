import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Music, LogOut, FolderOpen, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';

export function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="h-14 bg-panel border-b border-border">
      <div className="max-w-[1120px] mx-auto px-6 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="w-[26px] h-[26px] bg-accent rounded-md flex items-center justify-center">
            <Music className="w-[15px] h-[15px] text-accent-on" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">AudioAI</span>
        </Link>

        <nav className="flex items-center gap-3">
          {isLoginPage ? (
            <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to home
            </Button>
          ) : user ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => navigate('/projects')}>
                <FolderOpen className="w-3.5 h-3.5" />
                Projects
              </Button>
              <span className="font-mono text-xs text-fg-muted">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-3.5 h-3.5" />
                Log out
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
              Log in
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
