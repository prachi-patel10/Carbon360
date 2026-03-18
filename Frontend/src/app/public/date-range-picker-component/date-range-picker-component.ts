import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-date-range-picker-component',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, DatePipe],
  templateUrl: './date-range-picker-component.html',
  styleUrls: ['./date-range-picker-component.css'],
})
export class DateRangePickerComponent {

  showPicker = signal(false);
  private fb = inject(FormBuilder);

  today = new Date().toISOString().split('T')[0]; 

  @Output() rangeSelected = new EventEmitter<{ startDate: Date | null, endDate: Date | null }>();

  rangeForm: FormGroup;

  constructor() {
    this.rangeForm = this.fb.group({
      startDate: [null, Validators.required],
      endDate: [null, Validators.required]
    }, { validators: this.dateRangeValidator });
  }

  togglePicker() {
    this.showPicker.update(v => !v);
  }

  apply() {
    // Mark all controls as touched to trigger validation messages
    this.rangeForm.markAllAsTouched();

    if (this.rangeForm.invalid) return;

    const { startDate, endDate } = this.rangeForm.value;

    let start: Date | null = startDate ? new Date(startDate) : null;
    let end: Date | null = endDate ? new Date(endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    console.log('Start:', start);
    console.log('End:', end);

    this.rangeSelected.emit({ startDate: start, endDate: end });
    this.showPicker.set(false);
  }

  cancel() {
    this.showPicker.set(false);
  }

  // Custom validator
  dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const start = control.get('startDate')?.value;
    const end = control.get('endDate')?.value;

    if (!start || !end) return null;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate > endDate) {
      return { invalidRange: true };
    }

    return null;
  }
}