import { Link, useNavigate } from 'react-router-dom';
import { Music, LogOut, FolderOpen } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { NeonText } from '../ui/NeonText';
import { GlassButton } from '../ui/GlassButton';
import { HexagonPattern } from '../ui/HexagonPattern';

export function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="relative glass backdrop-blur-xl border-b border-neon-cyan/20 shadow-neon-cyan">
      <HexagonPattern color="cyan" opacity={0.05} />
      <div className="container mx-auto px-4 h-16 flex items-center justify-between relative z-10">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold font-tech">
          <Music className="w-6 h-6 text-neon-cyan drop-shadow-glow" />
          <NeonText color="cyan" intensity="medium">AudioAI</NeonText>
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <GlassButton
                variant="ghost"
                glowColor="cyan"
                size="sm"
                onClick={() => navigate('/projects')}
              >
                <FolderOpen className="w-4 h-4" />
                Projects
              </GlassButton>
              <span className="text-muted-foreground font-mono text-sm">{user.email}</span>
              <GlassButton
                variant="ghost"
                glowColor="cyan"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </GlassButton>
            </>
          ) : (
            <GlassButton
              variant="neon"
              glowColor="cyan"
              size="sm"
              onClick={() => navigate('/login')}
            >
              Login
            </GlassButton>
          )}
        </nav>
      </div>
    </header>
  );
}
