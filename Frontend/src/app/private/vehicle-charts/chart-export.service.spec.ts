import { TestBed } from '@angular/core/testing';

import { ChartExportService } from './chart-export.service';

describe('ChartExportService', () => {
  let service: ChartExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChartExportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
