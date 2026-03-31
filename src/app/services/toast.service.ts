import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'offline';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  duration: number; // ms, 0 = persistent
  dismissing: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts$ = new BehaviorSubject<ToastItem[]>([]);

  success(message: string, duration = 3000): string {
    return this.show('success', message, duration);
  }

  error(message: string, duration = 4000): string {
    return this.show('error', message, duration);
  }

  warning(message: string, duration = 4000): string {
    return this.show('warning', message, duration);
  }

  info(message: string, duration = 3000): string {
    return this.show('info', message, duration);
  }

  offline(message: string): string {
    return this.show('offline', message, 0);
  }

  dismiss(id: string): void {
    const list = this.toasts$.value;
    const toast = list.find(t => t.id === id);
    if (!toast || toast.dismissing) return;
    // mark as dismissing to trigger exit animation
    this.toasts$.next(list.map(t => t.id === id ? { ...t, dismissing: true } : t));
    setTimeout(() => {
      this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
    }, 300);
  }

  dismissAll(): void {
    this.toasts$.value.forEach(t => this.dismiss(t.id));
  }

  private show(variant: ToastVariant, message: string, duration: number): string {
    const id = Math.random().toString(36).slice(2);
    const toast: ToastItem = { id, variant, message, duration, dismissing: false };
    this.toasts$.next([...this.toasts$.value, toast]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }
}
