import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchVehicle } from './search-vehicle';

describe('SearchVehicle', () => {
  let component: SearchVehicle;
  let fixture: ComponentFixture<SearchVehicle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchVehicle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchVehicle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
