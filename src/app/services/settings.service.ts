import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';
import {
  UserProfile,
  AppSettings,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  ThemeMode,
} from '../models/nutrition.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly PROFILE_KEY = 'user_profile';
  private readonly SETTINGS_KEY = 'app_settings';

  profile$ = new BehaviorSubject<UserProfile>(DEFAULT_PROFILE);
  settings$ = new BehaviorSubject<AppSettings>(DEFAULT_SETTINGS);

  constructor(private storage: StorageService) {
    this.init();
  }

  private async init(): Promise<void> {
    const profile = await this.storage.get<UserProfile>(this.PROFILE_KEY);
    if (profile) this.profile$.next(profile);

    const settings = await this.storage.get<AppSettings>(this.SETTINGS_KEY);
    if (settings) this.settings$.next({ ...DEFAULT_SETTINGS, ...settings });

    this.applyTheme(this.settings$.value.theme);
  }

  // ── Profile ──

  async saveProfile(profile: UserProfile): Promise<void> {
    await this.storage.set(this.PROFILE_KEY, profile);
    this.profile$.next({ ...profile });
  }

  // ── Settings ──

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.storage.set(this.SETTINGS_KEY, settings);
    this.settings$.next({ ...settings });
    this.applyTheme(settings.theme);
  }

  async updateTheme(theme: ThemeMode): Promise<void> {
    const settings = { ...this.settings$.value, theme };
    await this.saveSettings(settings);
  }

  // ── Theme ──

  private readonly THEME_CLASSES = ['theme-aurora', 'theme-ember', 'theme-midnight', 'theme-coral', 'theme-mint'];

  applyTheme(theme: ThemeMode): void {
    const body = document.body;
    // Remove all theme classes
    this.THEME_CLASSES.forEach(cls => body.classList.remove(cls));
    // Apply selected theme
    body.classList.add(`theme-${theme}`);
    // Persist for instant load on next visit
    localStorage.setItem('macro_tracker_theme', theme);
  }

  // ── Data management ──

  async clearAllData(): Promise<void> {
    const keys = await this.storage.keys();
    for (const key of keys) {
      await this.storage.remove(key);
    }
    this.profile$.next(DEFAULT_PROFILE);
    this.settings$.next(DEFAULT_SETTINGS);
    this.applyTheme('aurora');
  }

  async exportData(): Promise<string> {
    const keys = await this.storage.keys();
    const data: Record<string, any> = {};
    for (const key of keys) {
      data[key] = await this.storage.get(key);
    }
    return JSON.stringify(data, null, 2);
  }
}
