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

  // ✅ Build local date string without UTC conversion
  private toLocalDateStr(d: Date): string {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  // ✅ Parse "yyyy-MM-dd" string directly — avoids UTC timezone shift
  private parseDateStr(str: string): Date {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d); // local midnight — no UTC shift
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['startDate'] || changes['endDate']) {
      if (this.startDate) {
        // ✅ Split string directly instead of new Date(this.startDate)
        this.selectedStart = this.parseDateStr(this.startDate.split('T')[0]);
        this.fromValue = this.startDate.split('T')[0];
      }
      if (this.endDate) {
        this.selectedEnd = this.parseDateStr(this.endDate.split('T')[0]);
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
      this.fromValue = '';
      this.toValue = '';
      this.activeQuick = '';
      this.pickerState.open(this.pickerId);
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

    // ✅ Parse directly from string — no new Date("yyyy-MM-dd") UTC shift
    const start = this.parseDateStr(this.fromValue);
    const end   = this.parseDateStr(this.toValue);

    if (start > end) return;

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    this.selectedStart = start;
    this.selectedEnd   = end;
    this.rangeSelected.emit({ startDate: start, endDate: end });
    this.pickerState.close();
  }

  setQuickRange(type: string) {
    const now = new Date();
    let start = new Date();
    let end   = new Date();

    if (type === 'today') {
      start = new Date();
      end   = new Date();
    } else if (type === 'week') {
      const day = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
      end = new Date();
    } else if (type === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end   = new Date();
    } else if (type === 'quarter') {
      start = new Date();
      start.setMonth(start.getMonth() - 3);
      end = new Date();
    } else if (type === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end   = new Date();
    }

    this.activeQuick = type;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    this.selectedStart = start;
    this.selectedEnd   = end;

    // ✅ Update input values using local date string
    this.fromValue = this.toLocalDateStr(start);
    this.toValue   = this.toLocalDateStr(end);

    this.rangeSelected.emit({ startDate: start, endDate: end });
    this.pickerState.close();
  }

  clearRange() {
    this.selectedStart = null;
    this.selectedEnd   = null;
    this.fromValue     = '';
    this.toValue       = '';
    this.activeQuick   = '';
    this.rangeSelected.emit({ startDate: null, endDate: null });
  }

  reset() {
    this.clearRange();
    this.pickerState.close();
  }

  setRange(start: Date, end: Date): void {
    this.selectedStart = start;
    this.selectedEnd   = end;
    // ✅ Use local date string instead of toISOString() which shifts to UTC
    this.fromValue  = this.toLocalDateStr(start);
    this.toValue    = this.toLocalDateStr(end);
    this.startDate  = this.fromValue;
    this.endDate    = this.toValue;
  }
}