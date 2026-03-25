import { Component, EventEmitter, HostListener, Input, Output, signal, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DatePickerStateServiceTs } from './date-picker-state.service.ts'; // adjust path

@Component({
  selector: 'app-date-range-picker-component',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './date-range-picker-component.html',
  styleUrls: ['./date-range-picker-component.css']
})
export class DateRangePickerComponent {

  @Input() pickerId: string = 'default';
  @Input() startDate: string | null = null;
  @Input() endDate: string | null = null;

  @Output() rangeSelected = new EventEmitter<{ startDate: Date | null, endDate: Date | null }>();

  today = new Date().toISOString().split('T')[0];

  selectedStart: Date | null = null;
  selectedEnd: Date | null = null;
  fromValue: string = '';
  toValue: string = '';
  activeQuick: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['startDate'] || changes['endDate']) {
      if (this.startDate) {
        this.selectedStart = new Date(this.startDate);
        this.fromValue = this.startDate.split('T')[0];
      }
      if (this.endDate) {
        this.selectedEnd = new Date(this.endDate);
        this.toValue = this.endDate.split('T')[0];
      }
    }
  }

  constructor(public pickerState: DatePickerStateServiceTs) { }

  get showPicker(): boolean {
    return this.pickerState.isOpen(this.pickerId);
  }

  togglePicker() {
    if (this.pickerState.isOpen(this.pickerId)) {
      this.pickerState.close();
    } else {
      // Reset inputs on open
      this.fromValue = '';
      this.toValue = '';
      this.activeQuick = '';
      this.pickerState.open(this.pickerId); // closes any other open picker
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('app-date-range-picker-component'))
      this.pickerState.close();
  }

  onFromChange(event: any) {
    this.fromValue = event.target.value;
    this.activeQuick = '';
    this.tryEmit();
  }

  onToChange(event: any) {
    this.toValue = event.target.value;
    this.activeQuick = '';
    this.tryEmit();
  }

  tryEmit() {
    if (!this.fromValue || !this.toValue) return;
    const start = new Date(this.fromValue);
    const end = new Date(this.toValue);
    if (start > end) return;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    this.selectedStart = start;
    this.selectedEnd = end;
    this.rangeSelected.emit({ startDate: start, endDate: end });
    this.pickerState.close();
  }

  setQuickRange(type: string) {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (type === 'today') {
      start = end = new Date();
    } else if (type === 'week') {
      const day = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
      end = new Date();
    } else if (type === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
    } else if (type === 'quarter') {
      start = new Date();
      start.setMonth(start.getMonth() - 3);
      end = new Date();
    } else if (type === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date();
    }

    this.activeQuick = type;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    this.selectedStart = start;
    this.selectedEnd = end;
    this.rangeSelected.emit({ startDate: start, endDate: end });
    this.pickerState.close();
  }

  clearRange() {
    this.selectedStart = null;
    this.selectedEnd = null;
    this.fromValue = '';
    this.toValue = '';
    this.activeQuick = '';
    this.rangeSelected.emit({ startDate: null, endDate: null });
  }

  reset() {
    this.clearRange();
    this.pickerState.close();
  }
}