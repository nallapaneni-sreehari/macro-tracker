import { Component, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-banner',
  templateUrl: './app-banner.component.html',
  styleUrls: ['./app-banner.component.scss'],
  standalone: false,
})
export class AppBannerComponent implements OnInit {
  visible = false;
  readonly apkUrl =
    'https://github.com/nallapaneni-sreehari/macro-tracker/releases/download/release-v1.0/MacroTracker.apk';

  ngOnInit(): void {
    // Only show on web browser, not on native Capacitor app
    if (!Capacitor.isNativePlatform()) {
      const dismissed = sessionStorage.getItem('app-banner-dismissed');
      this.visible = !dismissed;
    }
  }

  dismiss(): void {
    this.visible = false;
    sessionStorage.setItem('app-banner-dismissed', '1');
  }
}
