import { Injectable, signal } from '@angular/core';
@Injectable({
  providedIn: 'root',
})
export class DatePickerStateServiceTs {
  activePicker = signal<string | null>(null);

  open(id: string) {
    this.activePicker.set(id);
  }

  close() {
    this.activePicker.set(null);
  }

  isOpen(id: string): boolean {
    return this.activePicker() === id;
  }
}
