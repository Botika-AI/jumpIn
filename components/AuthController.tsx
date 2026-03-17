'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import LoginForm from '@/components/LoginForm';
import RegisterForm from '@/components/RegisterForm';
import Dashboard from '@/components/Dashboard';
import type { AuthState, UserProfile } from '@/types';

function mapSupabaseError(message: string): string {
  switch (message) {
    case 'Invalid login credentials':
      return 'Credenziali non valide.'
    case 'User already registered':
      return 'Email già registrata. Accedi invece.'
    case 'Email not confirmed':
      return 'Conferma la tua email prima di accedere.'
    default:
      return 'Errore di connessione. Riprova.'
  }
}

export default function AuthController() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [sheetsError, setSheetsError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (profile) {
          setUser(profile as UserProfile)
          setAuthState('dashboard')
        } else {
          setAuthState('login')
        }
      } else {
        setAuthState('login')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setAuthState('login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (email: string, password: string, onError: (msg: string) => void) => {
    setIsLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      onError(mapSupabaseError(error.message))
      setIsLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()
    if (profile) {
      setUser(profile as UserProfile)
      setAuthState('dashboard')
    }
    setIsLoading(false)
  }

  const handleRegister = async (
    profileData: Omit<UserProfile, 'id' | 'last_checkin'>,
    password: string
  ) => {
    setIsLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: profileData.email,
      password,
      options: {
        data: {
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          school: profileData.school,
          dob: profileData.dob,
        }
      }
    })
    if (error) {
      setRegisterError(mapSupabaseError(error.message))
      setIsLoading(false)
      return
    }
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      if (profile) {
        setUser(profile as UserProfile)
        setAuthState('dashboard')
      }
    }
    setIsLoading(false)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setAuthState('login')
  }

  const handleCheckIn = async (decodedText: string) => {
    if (!user) return
    const supabase = createClient()
    const checkinTime = new Date().toISOString()

    // 1. Supabase write — primary, must succeed
    const { error } = await supabase
      .from('profiles')
      .update({ last_checkin: checkinTime })
      .eq('id', user.id)
    if (!error) {
      setUser({ ...user, last_checkin: checkinTime })
    }

    // 2. Sheets write — secondary, non-fatal
    const dataOra = new Date(checkinTime).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: user.first_name,
          cognome: user.last_name,
          email: user.email,
          scuola: user.school,
          dataOra,
          decodedText,
        }),
      })
      if (!res.ok) {
        setSheetsError('Check-in registrato. Errore di sincronizzazione con il registro.')
      }
    } catch {
      setSheetsError('Check-in registrato. Errore di sincronizzazione con il registro.')
    }
  }

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
        registerError={registerError}
        onClearRegisterError={() => setRegisterError(null)}
      />
    );
  }

  if (authState === 'dashboard' && user) {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onCheckIn={handleCheckIn}
        sheetsError={sheetsError}
        onClearSheetsError={() => setSheetsError(null)}
      />
    );
  }

  return null;
}
