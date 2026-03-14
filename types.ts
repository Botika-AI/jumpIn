
export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  school: string;
  dob: string;
  last_checkin?: string;
}

export type AuthState = 'login' | 'register' | 'dashboard' | 'loading';

export interface SchoolOption {
  value: string;
  label: string;
}
