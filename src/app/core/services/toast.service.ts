import { Injectable, signal } from '@angular/core';
import { Toast } from '../models';

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  private add(type: Toast['type'], message: string) {
    const id = crypto.randomUUID();
    this.toasts.update(t => [...t, { id, type, message }]);
    setTimeout(() => this.remove(id), 4000);
  }

  success(message: string) { this.add('success', message); }
  error(message: string)   { this.add('error',   message); }
  info(message: string)    { this.add('info',    message); }
  warning(message: string) { this.add('warning', message); }

  remove(id: string) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}