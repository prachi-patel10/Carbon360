import { TestBed } from '@angular/core/testing';

import { VehicleServiceEC } from './vehicle-service-ec';

describe('VehicleServiceEC', () => {
  let service: VehicleServiceEC;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VehicleServiceEC);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
