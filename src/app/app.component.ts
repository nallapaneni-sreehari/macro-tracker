import { Component, OnInit, NgZone } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { StorageService } from './services/storage.service';
import { LoginPage } from './login/login.page';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(
    private modalCtrl: ModalController,
    private platform: Platform,
    private location: Location,
    private router: Router,
    private zone: NgZone,
    private storageService: StorageService
  ) {
    this.initializeApp();
  }

  initializeApp(): void {
    this.platform.ready().then(async () => {
      // Dismiss launch splash screen
      if ((window as any).__removeSplash) {
        (window as any).__removeSplash();
      }
      // Restore email from persistent storage before checking login
      await this.storageService.restoreEmail();
      if (!this.storageService.getUserEmail()) {
        this.promptForEmail();
      }
      this.registerBackButton();
    });
  }

  ngOnInit(): void {}

  private registerBackButton(): void {
    // Tab root paths where back should exit the app
    const tabRoots = ['/tabs/today', '/tabs/history', '/tabs/charts', '/tabs/goals', '/tabs/settings'];

    App.addListener('backButton', () => {
      this.zone.run(() => {
        const url = this.router.url;
        if (tabRoots.includes(url)) {
          App.minimizeApp();
        } else {
          this.location.back();
        }
      });
    });
  }

  private async promptForEmail(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: LoginPage,
      backdropDismiss: false,
      cssClass: 'login-modal-fullscreen',
    });
    await modal.present();
  }
}

