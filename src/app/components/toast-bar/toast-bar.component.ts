import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService, ToastItem } from '../../services/toast.service';

@Component({
  selector: 'app-toast-bar',
  templateUrl: './toast-bar.component.html',
  styleUrls: ['./toast-bar.component.scss'],
  standalone: false,
})
export class ToastBarComponent implements OnInit, OnDestroy {
  toasts: ToastItem[] = [];
  private sub?: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.sub = this.toastService.toasts$.subscribe(t => (this.toasts = t));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  iconFor(variant: ToastItem['variant']): string {
    const map: Record<string, string> = {
      success: 'checkmark-circle',
      error: 'close-circle',
      warning: 'warning',
      info: 'information-circle',
      offline: 'cloud-offline',
    };
    return map[variant] ?? 'information-circle';
  }

  trackById(_: number, t: ToastItem): string {
    return t.id;
  }
}
