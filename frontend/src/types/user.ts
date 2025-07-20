export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdateRequest {
  username: string;
  email: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}