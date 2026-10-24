import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

const TOKEN_KEY = 'macro_tracker_auth_token';
const USER_EMAIL_KEY = 'macro_tracker_user_email';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private storageReady: Promise<Storage>;

  constructor(private storage: Storage) {
    this.storageReady = this.storage.create();
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  async getTokenAsync(): Promise<string | null> {
    const storage = await this.storageReady;
    return localStorage.getItem(TOKEN_KEY) || await storage.get(TOKEN_KEY);
  }

  getUserEmail(): string | null {
    return localStorage.getItem(USER_EMAIL_KEY);
  }

  async saveSession(email: string, token: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    localStorage.setItem(USER_EMAIL_KEY, normalizedEmail);
    localStorage.setItem(TOKEN_KEY, token);
    const storage = await this.storageReady;
    await storage.set(USER_EMAIL_KEY, normalizedEmail);
    await storage.set(TOKEN_KEY, token);
  }

  async restoreSession(): Promise<void> {
    const storage = await this.storageReady;
    const token = localStorage.getItem(TOKEN_KEY) || await storage.get(TOKEN_KEY);
    const email = localStorage.getItem(USER_EMAIL_KEY) || await storage.get(USER_EMAIL_KEY);
    if (token && this.isTokenValid(token)) {
      localStorage.setItem(TOKEN_KEY, token);
      if (email) localStorage.setItem(USER_EMAIL_KEY, email);
    } else {
      await this.clearSession();
    }
  }

  async clearSession(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
    const storage = await this.storageReady;
    await storage.remove(TOKEN_KEY);
    await storage.remove(USER_EMAIL_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && this.isTokenValid(token);
  }

  private isTokenValid(token: string): boolean {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return false;
      const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
