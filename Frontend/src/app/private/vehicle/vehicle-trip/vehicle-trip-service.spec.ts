import { TestBed } from '@angular/core/testing';

import { VehicleTripService } from './vehicle-trip-service';

describe('VehicleTripService', () => {
  let service: VehicleTripService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VehicleTripService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
