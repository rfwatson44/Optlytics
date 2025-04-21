export type Role = 'user' | 'admin';

export interface Profile {
  id: string;
  role: Role;
  approved: boolean;
  created_at: string;
}
