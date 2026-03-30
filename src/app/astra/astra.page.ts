import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ModalController } from '@ionic/angular';
import { firstValueFrom, Subscription } from 'rxjs';
import { SettingsService } from '../services/settings.service';
import { MealService } from '../services/meal.service';
import { environment } from '../../environments/environment';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'What is my BMI?',
  'How many calories should I eat to lose weight?',
  'Am I hitting my protein goal today?',
  'What is my TDEE?',
  'Is my water intake enough?',
  'Suggest a high-protein snack under 200 calories',
];

@Component({
  selector: 'app-astra',
  templateUrl: './astra.page.html',
  styleUrls: ['./astra.page.scss'],
  standalone: false,
})
export class AstraPage implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;

  messages: ChatMessage[] = [];
  input = '';
  loading = false;
  suggestions = SUGGESTIONS;
  showSuggestions = true;

  private profile: any = {};
  private goals: any = {};
  private todayLog: any = {};
  private subs: Subscription[] = [];

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    private settingsService: SettingsService,
    private mealService: MealService,
  ) {}

  ngOnInit(): void {
    this.messages = [this.createGreeting()];

    this.subs.push(
      this.settingsService.profile$.subscribe(p => {
        const prevEmail = this.profile?.email;
        this.profile = p;
        if (p?.email && p.email !== prevEmail) {
          this.loadHistory();
        }
      }),
      this.settingsService.settings$.subscribe(),
      this.mealService.goals$.subscribe(g => (this.goals = g)),
      this.mealService.currentLog$.subscribe(log => (this.todayLog = log || {})),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private createGreeting(): ChatMessage {
    return {
      role: 'assistant',
      content: `Hi${this.profile?.name ? ', ' + this.profile.name : ''}! 👋 I'm **Milo**, your personal nutrition assistant. Ask me anything — your BMI, TDEE, macro breakdown, or nutrition advice tailored to your profile.`,
    };
  }

  private async loadHistory(): Promise<void> {
    const userId = this.profile?.email;
    if (!userId) return;
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/conversations/${encodeURIComponent(userId)}`),
      );
      if (res.messages?.length) {
        this.messages = [this.createGreeting(), ...res.messages];
        this.showSuggestions = false;
        this.scrollToBottom();
      }
    } catch { /* silent — show greeting only */ }
  }

  async send(text?: string): Promise<void> {
    const content = (text || this.input).trim();
    const userId = this.profile?.email;
    if (!content || !userId || this.loading) return;

    this.input = '';
    this.showSuggestions = false;
    this.messages.push({ role: 'user', content });
    this.scrollToBottom();
    this.loading = true;

    try {
      const res: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/ai/chat`, {
          userId,
          message: content,
          context: {
            profile: this.profile,
            goals: this.goals,
            todayLog: this.todayLog,
          },
        }),
      );
      this.messages.push({ role: 'assistant', content: res.reply });
    } catch (err: any) {
      this.messages.push({
        role: 'assistant',
        content: 'Sorry, I couldn\'t reach the server right now. Please try again in a moment.',
      });
    } finally {
      this.loading = false;
      this.scrollToBottom();
    }
  }

  clearChat(): void {
    const userId = this.profile?.email;
    if (userId) {
      this.http.delete(`${this.apiUrl}/conversations/${encodeURIComponent(userId)}`).subscribe();
    }
    this.messages = [this.createGreeting()];
    this.showSuggestions = true;
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 80);
  }
}
