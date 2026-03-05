import { TestBed } from '@angular/core/testing';

import { MyActionVehicleService } from './my-action-vehicle-service';

describe('MyActionVehicleService', () => {
  let service: MyActionVehicleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MyActionVehicleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
