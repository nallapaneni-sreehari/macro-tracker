import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonContent, LoadingController } from '@ionic/angular';
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
  @ViewChild(IonContent) content!: IonContent;
  dates: string[] = [];
  visibleDates: string[] = [];
  logs: Map<string, DailyLog> = new Map();
  macros: Map<string, Macros> = new Map();
  goals: MacroGoals = { calories: 2000, protein: 150, carbs: 250, fat: 65 };
  templates: MealTemplate[] = [];
  segment: 'history' | 'templates' = 'history';
  isLoaded = false;
  private readonly PAGE_SIZE = 7;

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
    this.visibleDates = [];
    this.logs.clear();
    this.macros.clear();
    await this.loadDatesUpTo(this.PAGE_SIZE);
    // Reload today
    await this.mealService.loadDay(getTodayKey());
    this.isLoaded = true;
    await loading.dismiss();
  }

  private async loadDatesUpTo(count: number): Promise<void> {
    const start = this.visibleDates.length;
    const end = Math.min(start + count, this.dates.length);
    for (let i = start; i < end; i++) {
      const date = this.dates[i];
      if (!this.logs.has(date)) {
        const log = await this.mealService.loadDay(date);
        this.logs.set(date, log);
        this.macros.set(date, calculateDailyMacros(log));
      }
      this.visibleDates.push(date);
    }
  }

  async loadMore(event: any): Promise<void> {
    await this.loadDatesUpTo(this.PAGE_SIZE);
    event.target.complete();
    if (this.visibleDates.length >= this.dates.length) {
      event.target.disabled = true;
    }
  }

  goToToday(): void {
    this.content.scrollToTop(400);
  }

  getLog(date: string): DailyLog | undefined {
    return this.logs.get(date);
  }

  getMacros(date: string): Macros {
    return this.macros.get(date) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  formatDate(date: string): string {
    const d = new Date(date + 'T00:00:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const rest = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${dayName}, ${rest}`;
  }

  getDayName(date: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
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
