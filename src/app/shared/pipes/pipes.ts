import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'timeago', standalone: true })
export class TimeagoPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (value == null || value === '') return '';
    const now = new Date();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (sec < 60)     return 'just now';
    if (sec < 3600)   return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400)  return `${Math.floor(sec / 3600)}h ago`;
    if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
}

@Pipe({ name: 'initials', standalone: true })
export class InitialsPipe implements PipeTransform {
  transform(name: string): string {
    return (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}

@Pipe({ name: 'truncate', standalone: true })
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, limit = 60): string {
    if (value == null || value === '') return '';
    return value.length > limit ? value.slice(0, limit) + '…' : value;
  }
}