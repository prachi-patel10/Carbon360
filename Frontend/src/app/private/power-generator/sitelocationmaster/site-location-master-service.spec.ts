import { TestBed } from '@angular/core/testing';

import { SiteLocationMasterService } from './site-location-master-service';

describe('SiteLocationMasterService', () => {
  let service: SiteLocationMasterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SiteLocationMasterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
