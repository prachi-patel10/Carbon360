import { TestBed } from '@angular/core/testing';

import { VehicleReportService } from './vehicle-report-service';

describe('VehicleReportService', () => {
  let service: VehicleReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VehicleReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
