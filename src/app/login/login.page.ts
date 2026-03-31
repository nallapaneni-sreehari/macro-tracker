import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StorageService } from '../services/storage.service';
import { MealService } from '../services/meal.service';
import { ToastService } from '../services/toast.service';
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
    private storageService: StorageService,
    private mealService: MealService,
    private toastService: ToastService,
    private http: HttpClient,
  ) {}

  async sendOtp(): Promise<void> {
    const email = this.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.toastService.warning('Please enter a valid email address.');
      return;
    }
    this.sending = true;
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/send-otp`, { email }),
      );
      this.step = 2;
      this.otp = '';
      this.toastService.success('Code sent! Check your inbox.');
    } catch (err: any) {
      this.toastService.error(err?.error?.error || 'Failed to send code. Try again.');
    } finally {
      this.sending = false;
    }
  }

  async verifyOtp(): Promise<void> {
    const otp = String(this.otp).trim();
    if (!otp || otp.length !== 6) {
      this.toastService.warning('Enter the 6-digit code from your email.');
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
      this.toastService.success('Welcome to MacroTracker! 🎉');
      await this.modalCtrl.dismiss({ success: true });
    } catch (err: any) {
      this.toastService.error(err?.error?.error || 'Invalid or expired code.');
    } finally {
      this.verifying = false;
    }
  }

  backToEmail(): void {
    this.step = 1;
    this.otp = '';
  }
}
