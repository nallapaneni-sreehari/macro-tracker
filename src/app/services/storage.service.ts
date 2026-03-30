import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

const USER_EMAIL_KEY = 'macro_tracker_user_email';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private _storage: Storage | null = null;
  private apiUrl = `${environment.apiUrl}/storage`;

  constructor(private http: HttpClient, private storage: Storage) {}

  private async initLocal(): Promise<void> {
    if (!this._storage) {
      this._storage = await this.storage.create();
    }
  }

  getUserEmail(): string | null {
    return localStorage.getItem(USER_EMAIL_KEY);
  }

  setUserEmail(email: string): void {
    const normalized = email.trim().toLowerCase();
    localStorage.setItem(USER_EMAIL_KEY, normalized);
    // Also persist to Ionic Storage (survives Android WebView localStorage clears)
    this.initLocal().then(() => this._storage?.set(USER_EMAIL_KEY, normalized));
  }

  /** Call once on app init to restore email from Ionic Storage into localStorage. */
  async restoreEmail(): Promise<void> {
    await this.initLocal();
    const stored = await this._storage?.get(USER_EMAIL_KEY);
    if (stored && !localStorage.getItem(USER_EMAIL_KEY)) {
      localStorage.setItem(USER_EMAIL_KEY, stored);
    }
  }

  private getUserId(): string | null {
    return this.getUserEmail();
  }

  async get<T>(key: string): Promise<T | null> {
    const userId = this.getUserId();
    if (userId) {
      try {
        const res = await firstValueFrom(
          this.http.get<{ value: T | null }>(`${this.apiUrl}/${encodeURIComponent(userId)}/${encodeURIComponent(key)}`)
        );
        if (res.value !== null && res.value !== undefined) {
          // Refresh local cache so offline reads are up to date
          await this.initLocal();
          await this._storage!.set(key, res.value);
          return res.value;
        }
        // DB has no value — fall through to local (handles migration from local-only installs)
      } catch (err) {
        console.warn(`[Storage] DB get failed for "${key}", using local:`, err);
      }
    }
    await this.initLocal();
    return this._storage!.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    // Always write to local first so data is never lost if DB is unreachable
    await this.initLocal();
    await this._storage!.set(key, value);

    // Then push to DB
    const userId = this.getUserId();
    if (userId) {
      try {
        await firstValueFrom(
          this.http.put(`${this.apiUrl}/${encodeURIComponent(userId)}/${encodeURIComponent(key)}`, { value })
        );
      } catch (err) {
        console.warn(`[Storage] DB set failed for "${key}", data saved locally only:`, err);
      }
    }
  }

  async remove(key: string): Promise<void> {
    const userId = this.getUserId();
    if (userId) {
      try {
        await firstValueFrom(
          this.http.delete(`${this.apiUrl}/${encodeURIComponent(userId)}/${encodeURIComponent(key)}`)
        );
        return;
      } catch { /* fall through to local */ }
    }
    await this.initLocal();
    await this._storage!.remove(key);
  }

  async keys(): Promise<string[]> {
    const userId = this.getUserId();
    if (userId) {
      try {
        const res = await firstValueFrom(
          this.http.get<{ keys: string[] }>(`${this.apiUrl}/${encodeURIComponent(userId)}`)
        );
        return res.keys;
      } catch { /* fall through to local */ }
    }
    await this.initLocal();
    return this._storage!.keys();
  }
}
