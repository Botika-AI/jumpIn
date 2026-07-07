export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  school: string;
  dob: string;
  last_checkin?: string;
  is_admin?: boolean;
  interests?: string[];
  goals?: string[];
}

export type AuthState = 'loading' | 'login' | 'register' | 'onboarding' | 'dashboard' | 'reset' | 'set-password';

export interface SchoolOption {
  value: string;
  label: string;
}

export interface JumpInEvent {
  id: string;
  name: string;
  event_date: string;
  event_end?: string;
  location: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  event_id: string;
  type: 'ingresso' | 'uscita';
  scanned_at: string;
}

export interface Azienda {
  id: string;
  name: string;
  sector: string;
  description?: string;
  logo_url?: string;
  website?: string;
  email?: string;
  location?: string;
  created_at: string;
}
