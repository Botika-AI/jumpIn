'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import LoginForm from '@/components/LoginForm';
import RegisterForm from '@/components/RegisterForm';
import Dashboard from '@/components/Dashboard';
import type { AuthState, UserProfile } from '@/types';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function AuthController() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useIsomorphicLayoutEffect(() => {
    try {
      const saved = localStorage.getItem('jumpin_user');
      if (saved) {
        const parsed = JSON.parse(saved) as UserProfile;
        setUser(parsed);
        setAuthState('dashboard');
      } else {
        setAuthState('login');
      }
    } catch {
      localStorage.removeItem('jumpin_user');
      setAuthState('login');
    }
  }, []);

  const handleLogin = (email: string, password: string, onError: (msg: string) => void) => {
    setIsLoading(true);
    setTimeout(() => {
      if (email === 'demo@example.com' && password === 'password123') {
        const mockUser: UserProfile = {
          id: 'demo-123',
          first_name: 'Demo',
          last_name: 'User',
          email: 'demo@example.com',
          school: 'JumpIn Testing School',
          dob: '2000-01-01',
          last_checkin: undefined,
        };
        setUser(mockUser);
        localStorage.setItem('jumpin_user', JSON.stringify(mockUser));
        setAuthState('dashboard');
      } else {
        onError('Credenziali non valide. Usa demo@example.com / password123');
      }
      setIsLoading(false);
    }, 1200);
  };

  const handleRegister = (profile: Omit<UserProfile, 'id' | 'last_checkin'>) => {
    setIsLoading(true);
    setTimeout(() => {
      const mockUser: UserProfile = {
        id: Math.random().toString(36).substr(2, 9),
        ...profile,
        last_checkin: undefined,
      };
      setUser(mockUser);
      localStorage.setItem('jumpin_user', JSON.stringify(mockUser));
      setAuthState('dashboard');
      setIsLoading(false);
    }, 2000);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('jumpin_user');
    setAuthState('login');
  };

  const handleCheckIn = () => {
    if (!user) return;
    const updatedUser = { ...user, last_checkin: new Date().toISOString() };
    setUser(updatedUser);
    localStorage.setItem('jumpin_user', JSON.stringify(updatedUser));
  };

  if (authState === 'loading') {
    return null;
  }

  if (authState === 'login') {
    return (
      <LoginForm
        onLogin={handleLogin}
        isLoading={isLoading}
        onNavigateRegister={() => setAuthState('register')}
      />
    );
  }

  if (authState === 'register') {
    return (
      <RegisterForm
        onRegister={handleRegister}
        isLoading={isLoading}
        onNavigateLogin={() => setAuthState('login')}
      />
    );
  }

  if (authState === 'dashboard' && user) {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onCheckIn={handleCheckIn}
      />
    );
  }

  return null;
}
