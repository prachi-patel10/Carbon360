import { TestBed } from '@angular/core/testing';

import { MyActionGeneratorService } from './my-action-generator-service';

describe('MyActionGeneratorService', () => {
  let service: MyActionGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MyActionGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
