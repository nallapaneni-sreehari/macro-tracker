import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ToastController, LoadingController, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { SettingsService } from '../services/settings.service';
import { StorageService } from '../services/storage.service';
import { LoginPage } from '../login/login.page';
import {
  UserProfile,
  AppSettings,
  ThemeMode,
  Gender,
  ActivityLevel,
  WeightUnit,
  HeightUnit,
  MEAL_ICONS,
  THEME_OPTIONS,
} from '../models/nutrition.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit, OnDestroy {
  profile: UserProfile = {
    email: '', name: '', age: null, gender: 'prefer-not-to-say',
    weight: null, weightUnit: 'kg', height: null, heightUnit: 'cm',
    activityLevel: 'moderate',
  };

  settings: AppSettings = {
    theme: 'aurora', defaultMeals: ['Breakfast', 'Lunch', 'Dinner'],
    waterGoal: 3, showFiber: true, showSugar: false, showSodium: false,
    notificationsEnabled: false,
  };

  mealOptions = Object.keys(MEAL_ICONS).filter(k => k !== 'Custom');
  themeOptions = THEME_OPTIONS;

  private subs: Subscription[] = [];

  constructor(
    private settingsService: SettingsService,
    private storageService: StorageService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private modalCtrl: ModalController
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.settingsService.profile$.subscribe(p => {
        this.profile = { ...p };
        if (!this.profile.email) {
          this.profile.email = this.storageService.getUserEmail() || '';
        }
      }),
      this.settingsService.settings$.subscribe(s => this.settings = { ...s })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── Profile ──

  async saveProfile(): Promise<void> {
    const email = (this.profile.email || '').trim();
    if (!email || !email.includes('@')) {
      await this.showToast('Please enter a valid email');
      return;
    }
    const loading = await this.loadingCtrl.create({ message: 'Saving profile...', duration: 5000 });
    await loading.present();
    this.storageService.setUserEmail(email);
    await this.settingsService.saveProfile(this.profile);
    await loading.dismiss();
    await this.showToast('Profile saved');
  }

  async logout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Log Out',
      message: 'Are you sure you want to log out? You will need to verify your email to sign back in.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Log Out',
          role: 'destructive',
          handler: async () => {
            // Clear the stored email from both localStorage and Ionic Storage
            localStorage.removeItem('macro_tracker_user_email');
            await this.storageService.remove('macro_tracker_user_email');

            // Show the login modal
            const modal = await this.modalCtrl.create({
              component: LoginPage,
              backdropDismiss: false,
              cssClass: 'login-modal-fullscreen',
            });
            await modal.present();
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Theme ──

  async selectTheme(themeId: ThemeMode): Promise<void> {
    this.settings.theme = themeId;
    await this.settingsService.updateTheme(themeId);
  }

  async onThemeChange(): Promise<void> {
    await this.settingsService.updateTheme(this.settings.theme);
  }

  // ── Settings ──

  async saveSettings(): Promise<void> {
    await this.settingsService.saveSettings(this.settings);
    await this.showToast('Settings saved');
  }

  isDefaultMeal(meal: string): boolean {
    return this.settings.defaultMeals.includes(meal);
  }

  toggleDefaultMeal(meal: string): void {
    if (this.isDefaultMeal(meal)) {
      this.settings.defaultMeals = this.settings.defaultMeals.filter(m => m !== meal);
    } else {
      this.settings.defaultMeals.push(meal);
    }
  }

  // ── Data management ──

  async exportData(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Exporting...', duration: 10000 });
    await loading.present();
    const json = await this.settingsService.exportData();
    await loading.dismiss();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `macrotracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await this.showToast('Data exported');
  }

  async clearAllData(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Clear All Data',
      message: 'This will permanently delete all your meals, history, goals, and settings. This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete Everything',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Clearing data...', duration: 10000 });
            await loading.present();
            await this.settingsService.clearAllData();
            await loading.dismiss();
            await this.showToast('All data cleared');
          },
        },
      ],
    });
    await alert.present();
  }

  // ── BMR Calculation ──

  get estimatedBMR(): number | null {
    if (!this.profile.weight || !this.profile.height || !this.profile.age) return null;
    let weightKg = this.profile.weight;
    let heightCm = this.profile.height;
    if (this.profile.weightUnit === 'lbs') weightKg = weightKg * 0.453592;
    if (this.profile.heightUnit === 'ft') heightCm = heightCm * 30.48;

    // Mifflin-St Jeor
    let bmr: number;
    if (this.profile.gender === 'male') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * this.profile.age + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * this.profile.age - 161;
    }
    return Math.round(bmr);
  }

  get estimatedTDEE(): number | null {
    if (!this.estimatedBMR) return null;
    const multipliers: Record<ActivityLevel, number> = {
      'sedentary': 1.2,
      'light': 1.375,
      'moderate': 1.55,
      'active': 1.725,
      'very-active': 1.9,
    };
    return Math.round(this.estimatedBMR * multipliers[this.profile.activityLevel]);
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 1500,
      position: 'bottom',
      color: 'success',
      icon: 'checkmark-circle-outline',
    });
    await toast.present();
  }
}
