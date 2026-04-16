export interface User {
  name: string;
}

export interface Session {
  loggedIn: boolean;
  userName: string;
  timestamp: number;
}
