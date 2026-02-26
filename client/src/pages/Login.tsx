import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../lib/api';
import { AnimatedGradient } from '../components/ui/AnimatedGradient';
import { GridBackground } from '../components/ui/GridBackground';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassInput } from '../components/ui/GlassInput';
import { NeonText } from '../components/ui/NeonText';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = isRegister
        ? await authApi.register(email, password)
        : await authApi.login(email, password);

      setAuth(response.data.token, response.data.user);
      navigate('/projects');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background layers */}
      <AnimatedGradient variant="cyber" />
      <GridBackground variant="hexagon" color="purple" />

      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8 font-tech">
            <NeonText color="purple" intensity="medium">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </NeonText>
          </h1>

          <GlassCard glowColor="purple" variant="elevated" className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-4 rounded-lg bg-neon-pink/10 border border-neon-pink/30 text-neon-pink shadow-neon-pink">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-foreground">
                  Email
                </label>
                <GlassInput
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  glowColor="purple"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-foreground">
                  Password
                </label>
                <GlassInput
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  glowColor="purple"
                  placeholder="••••••••"
                />
              </div>

              <GlassButton
                type="submit"
                disabled={loading}
                variant="neon"
                glowColor="purple"
                className="w-full"
              >
                {loading ? (
                  <>
                    <LoadingSpinner color="purple" size="sm" />
                    Loading...
                  </>
                ) : (
                  isRegister ? 'Create Account' : 'Sign In'
                )}
              </GlassButton>
            </form>

            <p className="text-center mt-6 text-foreground/70">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-neon-purple hover:text-neon-pink transition-colors drop-shadow-glow-sm"
              >
                {isRegister ? 'Sign In' : 'Register'}
              </button>
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
