export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  // True while a stored token is being exchanged for the user profile.
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;
}
