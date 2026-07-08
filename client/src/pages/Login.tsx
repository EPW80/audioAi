import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
    <div className="px-6 pt-[88px] pb-16">
      <div className="max-w-[400px] mx-auto">
        <Card radius={12} className="p-8">
          <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.01em]">
            {isRegister ? 'Create account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-fg-secondary mt-1.5 mb-7">
            {isRegister
              ? 'Start turning your audio into visuals.'
              : 'Sign in to your projects and exports.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-[18px]">
            {error && (
              <div
                className="p-3 rounded-md text-[13px]"
                style={{
                  color: 'var(--status-failed)',
                  background: 'rgba(217, 95, 88, 0.1)',
                  border: '1px solid rgba(217, 95, 88, 0.3)',
                }}
              >
                {error}
              </div>
            )}

            <Input
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />

            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
            />

            <Button type="submit" disabled={loading} variant="primary" className="w-full py-[11px]">
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="text-accent-on" />
                  Loading...
                </>
              ) : isRegister ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </Card>

        <p className="text-center mt-5 text-sm text-fg-secondary">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-accent font-medium hover:text-accent-hover transition-colors duration-150"
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
}
