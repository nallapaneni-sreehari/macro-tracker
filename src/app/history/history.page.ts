import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { MealService } from '../services/meal.service';
import {
  DailyLog,
  Macros,
  MacroGoals,
  MealTemplate,
  calculateDailyMacros,
  getTodayKey,
} from '../models/nutrition.model';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: false,
})
export class HistoryPage {
  dates: string[] = [];
  logs: Map<string, DailyLog> = new Map();
  macros: Map<string, Macros> = new Map();
  goals: MacroGoals = { calories: 2000, protein: 150, carbs: 250, fat: 65 };
  templates: MealTemplate[] = [];
  segment: 'history' | 'templates' = 'history';
  isLoaded = false;

  constructor(
    private mealService: MealService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  async ionViewWillEnter(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Loading history...', duration: 10000 });
    await loading.present();
    this.goals = this.mealService.goals$.value;
    this.dates = await this.mealService.getLoggedDates();
    this.templates = await this.mealService.getTemplates();
    for (const date of this.dates) {
      const log = await this.mealService.loadDay(date);
      this.logs.set(date, log);
      this.macros.set(date, calculateDailyMacros(log));
    }
    // Reload today
    await this.mealService.loadDay(getTodayKey());
    this.isLoaded = true;
    await loading.dismiss();
  }

  getLog(date: string): DailyLog | undefined {
    return this.logs.get(date);
  }

  getMacros(date: string): Macros {
    return this.macros.get(date) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  formatDate(date: string): string {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  isToday(date: string): boolean {
    return date === getTodayKey();
  }

  async applyTemplate(template: MealTemplate): Promise<void> {
    await this.mealService.applyTemplate(getTodayKey(), template);
    this.router.navigate(['/tabs/today']);
  }

  async deleteTemplate(template: MealTemplate): Promise<void> {
    await this.mealService.deleteTemplate(template.id);
    this.templates = await this.mealService.getTemplates();
  }

  async renameTemplate(template: MealTemplate): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Rename Template',
      inputs: [
        { name: 'name', type: 'text', value: template.name, placeholder: 'Template name' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            const name = (data.name || '').trim();
            if (name && name !== template.name) {
              await this.mealService.renameTemplate(template.id, name);
              this.templates = await this.mealService.getTemplates();
            }
          },
        },
      ],
    });
    await alert.present();
  }
}
