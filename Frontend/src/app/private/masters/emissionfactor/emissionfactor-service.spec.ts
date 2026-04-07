import { TestBed } from '@angular/core/testing';

import { EmissionFactorService } from './emissionfactor-service';

describe('EmissionfactorService', () => {
  let service: EmissionFactorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmissionFactorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
