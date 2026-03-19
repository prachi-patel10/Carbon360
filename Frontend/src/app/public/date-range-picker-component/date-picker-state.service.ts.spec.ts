import { TestBed } from '@angular/core/testing';

import { DatePickerStateServiceTs } from './date-picker-state.service.ts';

describe('DatePickerStateServiceTs', () => {
  let service: DatePickerStateServiceTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DatePickerStateServiceTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
