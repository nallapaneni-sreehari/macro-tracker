import { Component } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StorageService } from '../services/storage.service';
import { MealService } from '../services/meal.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  step: 1 | 2 = 1;
  email = '';
  otp = '';
  sending = false;
  verifying = false;

  private apiUrl = environment.apiUrl;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private storageService: StorageService,
    private mealService: MealService,
    private http: HttpClient,
  ) {}

  async sendOtp(): Promise<void> {
    const email = this.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await this.toast('Please enter a valid email address.', 'warning');
      return;
    }
    this.sending = true;
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/send-otp`, { email }),
      );
      this.step = 2;
      this.otp = '';
      await this.toast('Code sent! Check your inbox.', 'success');
    } catch (err: any) {
      await this.toast(err?.error?.error || 'Failed to send code. Try again.', 'danger');
    } finally {
      this.sending = false;
    }
  }

  async verifyOtp(): Promise<void> {
    const otp = String(this.otp).trim();
    if (!otp || otp.length !== 6) {
      await this.toast('Enter the 6-digit code from your email.', 'warning');
      return;
    }
    this.verifying = true;
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/verify-otp`, {
          email: this.email.trim().toLowerCase(),
          otp,
        }),
      );
      this.storageService.setUserEmail(this.email.trim().toLowerCase());
      await this.mealService.reloadAfterLogin();
      await this.toast('Welcome to MacroTracker! 🎉', 'success');
      await this.modalCtrl.dismiss({ success: true });
    } catch (err: any) {
      await this.toast(err?.error?.error || 'Invalid or expired code.', 'danger');
    } finally {
      this.verifying = false;
    }
  }

  backToEmail(): void {
    this.step = 1;
    this.otp = '';
  }

  private async toast(message: string, color: string): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await t.present();
  }
}
