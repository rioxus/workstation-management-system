import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { MapPin } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  loading: boolean;
  error?: string;
}

export function LoginPage({ onLogin, loading, error }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <MapPin className="w-8 h-8 text-blue-500" />
            <CardTitle className="text-2xl">System Allotment Tracker</CardTitle>
          </div>
          <CardDescription>
            Sign in to manage workstation requests and allocations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-500 text-center">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
            <p className="text-slate-600">Demo Accounts (use email: angkik.borthakur@hitechdigital.com):</p>
            <div className="space-y-1 text-xs text-slate-500">
              <p><strong>Admin:</strong> Password: Versetile@4</p>
              <p><strong>Manager:</strong> Password: Versetile@3</p>
              <p><strong>Technical:</strong> Password: Versetile@2</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
