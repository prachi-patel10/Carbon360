import { TestBed } from '@angular/core/testing';

import { EmissionfactorService } from './emissionfactor-service';

describe('EmissionfactorService', () => {
  let service: EmissionfactorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmissionfactorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
