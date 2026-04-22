export interface User {
  name: string;
  email?: string;
  picture?: string;
  role?: string;
}

export interface Session {
  loggedIn: boolean;
  userName: string;
  userEmail: string;
  userPicture?: string;
  userRole?: string;
  timestamp: number;
}

export interface AllowedUser {
  email: string;
  name: string;
  role: string;
}
