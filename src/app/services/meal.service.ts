import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { StorageService } from './storage.service';
import {
  DailyLog,
  Meal,
  FoodItem,
  MacroGoals,
  MealTemplate,
  DEFAULT_GOALS,
  generateId,
  getTodayKey,
} from '../models/nutrition.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MealService {
  private readonly GOALS_KEY = 'macro_goals';
  private readonly TEMPLATES_KEY = 'meal_templates';
  private logKey(date: string): string {
    return `daily_log_${date}`;
  }

  currentLog$ = new BehaviorSubject<DailyLog | null>(null);
  goals$ = new BehaviorSubject<MacroGoals>(DEFAULT_GOALS);

  constructor(private storage: StorageService, private http: HttpClient) {
    this.init();
  }

  private async init(): Promise<void> {
    // Load local goals immediately so UI is not blocked
    const localGoals = await this.storage.get<MacroGoals>(this.GOALS_KEY);
    if (localGoals) this.goals$.next(localGoals);

    // Fetch server goals (survives reinstall); server wins if present
    const email = this.storage.getUserEmail();
    if (email) {
      try {
        const res = await firstValueFrom(
          this.http.get<{ value: MacroGoals | null }>(`${environment.apiUrl}/storage/${encodeURIComponent(email)}/macro_goals`)
        );
        if (res?.value) {
          this.goals$.next(res.value);
          await this.storage.set(this.GOALS_KEY, res.value);
        }
      } catch { /* offline — local value already applied */ }
    }

    await this.loadDay(getTodayKey());
  }

  // ── Day management ──

  async loadDay(date: string): Promise<DailyLog> {
    let log = await this.storage.get<DailyLog>(this.logKey(date));
    if (!log) {
      log = { date, meals: [], waterIntake: 0 };
    }
    this.currentLog$.next(log);
    return log;
  }

  private async saveLog(log: DailyLog): Promise<void> {
    await this.storage.set(this.logKey(log.date), log);
    if (log.date === getTodayKey()) {
      this.currentLog$.next({ ...log });
    }
  }

  // ── Meal CRUD ──

  async addMeal(date: string, name: string, icon: string): Promise<Meal> {
    const log = await this.loadDay(date);
    const meal: Meal = { id: generateId(), name, icon, items: [], completed: false };
    log.meals.push(meal);
    await this.saveLog(log);
    return meal;
  }

  async removeMeal(date: string, mealId: string): Promise<void> {
    const log = await this.loadDay(date);
    log.meals = log.meals.filter((m) => m.id !== mealId);
    await this.saveLog(log);
  }

  async toggleMealComplete(date: string, mealId: string): Promise<void> {
    const log = await this.loadDay(date);
    const meal = log.meals.find((m) => m.id === mealId);
    if (meal) {
      meal.completed = !meal.completed;
      await this.saveLog(log);
    }
  }

  async renameMeal(date: string, mealId: string, name: string, icon: string): Promise<void> {
    const log = await this.loadDay(date);
    const meal = log.meals.find((m) => m.id === mealId);
    if (meal) {
      meal.name = name;
      meal.icon = icon;
      await this.saveLog(log);
    }
  }

  // ── Food item CRUD ──

  async addFoodItem(date: string, mealId: string, item: FoodItem): Promise<void> {
    const log = await this.loadDay(date);
    const meal = log.meals.find((m) => m.id === mealId);
    if (meal) {
      meal.items.push(item);
      await this.saveLog(log);
    }
  }

  async updateFoodItem(date: string, mealId: string, item: FoodItem): Promise<void> {
    const log = await this.loadDay(date);
    const meal = log.meals.find((m) => m.id === mealId);
    if (meal) {
      const idx = meal.items.findIndex((i) => i.id === item.id);
      if (idx !== -1) {
        meal.items[idx] = item;
        await this.saveLog(log);
      }
    }
  }

  async removeFoodItem(date: string, mealId: string, itemId: string): Promise<void> {
    const log = await this.loadDay(date);
    const meal = log.meals.find((m) => m.id === mealId);
    if (meal) {
      meal.items = meal.items.filter((i) => i.id !== itemId);
      await this.saveLog(log);
    }
  }

  // ── Water ──

  async updateWater(date: string, liters: number): Promise<void> {
    const log = await this.loadDay(date);
    log.waterIntake = Math.max(0, Math.round(liters * 100) / 100);
    await this.saveLog(log);
  }

  // ── Goals ──

  /** Call this after login so goals + today's log are fetched now that email is known. */
  async reloadAfterLogin(): Promise<void> {
    const email = this.storage.getUserEmail();
    if (email) {
      try {
        const res = await firstValueFrom(
          this.http.get<{ value: MacroGoals | null }>(`${environment.apiUrl}/storage/${encodeURIComponent(email)}/macro_goals`)
        );
        if (res?.value) {
          this.goals$.next(res.value);
          await this.storage.set(this.GOALS_KEY, res.value);
        }
      } catch { /* offline */ }
    }
    await this.loadDay(getTodayKey());
  }

  async saveGoals(goals: MacroGoals): Promise<void> {
    await this.storage.set(this.GOALS_KEY, goals);
    this.goals$.next(goals);

    // Persist to server so goals survive app reinstall
    const email = this.storage.getUserEmail();
    if (email) {
      try {
        await firstValueFrom(
          this.http.put(`${environment.apiUrl}/storage/${encodeURIComponent(email)}/macro_goals`, { value: goals })
        );
      } catch { /* offline — already saved locally */ }
    }
  }

  // ── Templates ──

  async getTemplates(): Promise<MealTemplate[]> {
    return (await this.storage.get<MealTemplate[]>(this.TEMPLATES_KEY)) || [];
  }

  async saveTemplate(template: MealTemplate): Promise<void> {
    const templates = await this.getTemplates();
    templates.push(template);
    await this.storage.set(this.TEMPLATES_KEY, templates);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    let templates = await this.getTemplates();
    templates = templates.filter((t) => t.id !== templateId);
    await this.storage.set(this.TEMPLATES_KEY, templates);
  }

  async renameTemplate(templateId: string, name: string): Promise<void> {
    const templates = await this.getTemplates();
    const t = templates.find((t) => t.id === templateId);
    if (t) {
      t.name = name;
      await this.storage.set(this.TEMPLATES_KEY, templates);
    }
  }

  async applyTemplate(date: string, template: MealTemplate): Promise<void> {
    const log = await this.loadDay(date);
    const meal: Meal = {
      id: generateId(),
      name: template.name,
      icon: template.icon,
      items: template.items.map((i) => ({ ...i, id: generateId() })),
      completed: false,
    };
    log.meals.push(meal);
    await this.saveLog(log);
  }

  // ── History ──

  async getLoggedDates(): Promise<string[]> {
    const allKeys = await this.storage.keys();
    return allKeys
      .filter((k) => k.startsWith('daily_log_'))
      .map((k) => k.replace('daily_log_', ''))
      .sort()
      .reverse();
  }
}
