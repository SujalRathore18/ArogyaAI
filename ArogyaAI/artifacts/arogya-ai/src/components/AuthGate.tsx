import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocation } from 'wouter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const AuthGate: React.FC = () => {
  const { user, login, register, loginAsGuest } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'mgmt'>('patient');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password, role);
      }
      setLocation(role === 'mgmt' ? '/mgmt' : '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuest = () => {
    loginAsGuest();
    setLocation('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="w-full max-w-md p-8 bg-card rounded-xl shadow-xl border border-border">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="hsl(35, 75%, 52%)" strokeWidth="2" className="w-8 h-8">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground">ArogyaAI</h1>
          <p className="text-sm font-mono text-muted-foreground mt-2">Smart Health Platform</p>
        </div>

        <div className="flex space-x-4 mb-6">
          <button
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${tab === 'login' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => { setTab('login'); setError(null); }}
          >
            Login
          </button>
          <button
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${tab === 'register' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => { setTab('register'); setError(null); }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
          </div>
          {tab === 'register' && (
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(val: 'patient' | 'mgmt') => setRole(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient / ASHA Worker</SelectItem>
                  <SelectItem value="mgmt">District Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full mt-4 font-medium" disabled={submitting} data-testid="button-login">
            {submitting ? 'Please wait…' : tab === 'login' ? 'Login' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleGuest}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            data-testid="link-guest"
          >
            Continue as guest (demo mode) &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
