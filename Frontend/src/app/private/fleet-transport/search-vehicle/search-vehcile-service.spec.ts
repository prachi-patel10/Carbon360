import { TestBed } from '@angular/core/testing';

import { SearchVehcileService } from './search-vehcile-service';

describe('SearchVehcileService', () => {
  let service: SearchVehcileService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchVehcileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
