import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, LoadingController, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MealService } from '../services/meal.service';
import { AstraPage } from '../astra/astra.page';
import {
  DailyLog,
  Meal,
  MacroGoals,
  Macros,
  MealTemplate,
  MEAL_ICONS,
  calculateDailyMacros,
  calculateMealMacros,
  getTodayKey,
} from '../models/nutrition.model';

@Component({
  selector: 'app-today',
  templateUrl: './today.page.html',
  styleUrls: ['./today.page.scss'],
  standalone: false,
})
export class TodayPage implements OnInit, OnDestroy {
  log: DailyLog | null = null;
  goals: MacroGoals = { calories: 2000, protein: 150, carbs: 250, fat: 65, fiber: 30 };
  dailyMacros: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  selectedDate: string = getTodayKey();
  todayKey: string = getTodayKey();
  mealIcons = MEAL_ICONS;

  private subs: Subscription[] = [];
  private waterUpdate$ = new Subject<{ date: string; liters: number }>();
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private mealService: MealService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private modalCtrl: ModalController,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.mealService.currentLog$.subscribe((log) => {
        this.log = log;
        if (log) {
          this.dailyMacros = calculateDailyMacros(log);
        }
      }),
      this.mealService.goals$.subscribe((g) => (this.goals = g)),
      this.waterUpdate$.pipe(debounceTime(800)).subscribe(({ date, liters }) => {
        this.mealService.updateWater(date, liters);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  async openAstra(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AstraPage,
      cssClass: 'astra-modal',
    });
    await modal.present();
  }

  async ionViewWillEnter(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Loading...', duration: 5000 });
    await loading.present();
    await this.mealService.loadDay(this.selectedDate);
    await loading.dismiss();
  }

  get isToday(): boolean {
    return this.selectedDate === getTodayKey();
  }

  async onDateChange(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Loading...', duration: 5000 });
    await loading.present();
    await this.mealService.loadDay(this.selectedDate);
    await loading.dismiss();
  }

  goDay(offset: number): void {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() + offset);
    this.selectedDate = d.toISOString().split('T')[0];
    this.todayKey = getTodayKey();
    this.onDateChange();
  }

  async openDatePicker(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Select Date',
      inputs: [{ name: 'date', type: 'date', value: this.selectedDate }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Go',
          handler: (data) => {
            if (data.date) {
              this.selectedDate = data.date;
              this.todayKey = getTodayKey();
              this.onDateChange();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  macroPercent(current: number, goal: number): number {
    if (!goal) return 0;
    return Math.min(Math.round((current / goal) * 100), 100);
  }

  getMealMacros(meal: Meal): Macros {
    return calculateMealMacros(meal);
  }

  async addMeal(): Promise<void> {
    const mealNames = Object.keys(MEAL_ICONS);
    const alert = await this.alertCtrl.create({
      header: 'Add Meal',
      inputs: mealNames.map((name) => ({
        type: 'radio' as const,
        label: name,
        value: name,
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'From Template',
          handler: () => {
            this.addFromTemplate();
            return true;
          },
        },
        {
          text: 'Custom Name',
          handler: () => {
            this.addCustomMeal();
            return true;
          },
        },
        {
          text: 'Add',
          handler: (value: string) => {
            if (value) {
              const icon = MEAL_ICONS[value] || 'restaurant-outline';
              this.mealService.addMeal(this.selectedDate, value, icon);
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async addFromTemplate(): Promise<void> {
    const templates = await this.mealService.getTemplates();
    if (templates.length === 0) {
      const alert = await this.alertCtrl.create({
        header: 'No Templates',
        message: 'You haven\'t saved any meal templates yet. Open a meal and tap "Save as Template" to create one.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Choose Template',
      inputs: templates.map((t) => ({
        type: 'radio' as const,
        label: `${t.name} (${t.items.length} item${t.items.length !== 1 ? 's' : ''})`,
        value: t.id,
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (templateId: string) => {
            if (templateId) {
              const template = templates.find((t) => t.id === templateId);
              if (template) {
                this.mealService.applyTemplate(this.selectedDate, template);
              }
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async addCustomMeal(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Custom Meal',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Meal name (e.g. Brunch)' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            const name = (data.name || '').trim();
            if (name) {
              this.mealService.addMeal(this.selectedDate, name, 'restaurant-outline');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  openMeal(meal: Meal): void {
    this.router.navigate(['/tabs/meal', this.selectedDate, meal.id]);
  }

  async toggleComplete(event: Event, meal: Meal): Promise<void> {
    event.stopPropagation();
    await this.mealService.toggleMealComplete(this.selectedDate, meal.id);
  }

  onMealTouchStart(event: Event, meal: Meal): void {
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      this.renameMeal(meal);
    }, 600);
  }

  onMealTouchEnd(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  async renameMeal(meal: Meal): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Rename Meal',
      inputs: [
        { name: 'name', type: 'text', value: meal.name, placeholder: 'Meal name' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            const name = (data.name || '').trim();
            if (name && name !== meal.name) {
              this.mealService.renameMeal(this.selectedDate, meal.id, name, meal.icon);
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async removeMeal(meal: Meal): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Meal',
      message: `Remove "${meal.name}" and all its items?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this.mealService.removeMeal(this.selectedDate, meal.id),
        },
      ],
    });
    await alert.present();
  }

  async setWaterCustom(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Set Water Intake',
      inputs: [
        {
          name: 'liters',
          type: 'number',
          value: this.log?.waterIntake ?? 0,
          placeholder: 'Liters (e.g. 3.5)',
          min: 0,
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Set',
          handler: (data) => {
            const val = parseFloat(data.liters);
            if (!isNaN(val) && val >= 0 && this.log) {
              this.log.waterIntake = Math.round(val * 100) / 100;
              this.waterUpdate$.next({ date: this.selectedDate, liters: this.log.waterIntake });
            }
          },
        },
      ],
    });
    await alert.present();
  }

  addWater(): void {
    if (this.log) {
      this.log.waterIntake = Math.max(0, Math.round((this.log.waterIntake + 0.25) * 100) / 100);
      this.waterUpdate$.next({ date: this.selectedDate, liters: this.log.waterIntake });
    }
  }

  removeWater(): void {
    if (this.log) {
      this.log.waterIntake = Math.max(0, Math.round((this.log.waterIntake - 0.25) * 100) / 100);
      this.waterUpdate$.next({ date: this.selectedDate, liters: this.log.waterIntake });
    }
  }

  get completedMeals(): number {
    return this.log?.meals.filter((m) => m.completed).length || 0;
  }

  get totalMeals(): number {
    return this.log?.meals.length || 0;
  }
}
