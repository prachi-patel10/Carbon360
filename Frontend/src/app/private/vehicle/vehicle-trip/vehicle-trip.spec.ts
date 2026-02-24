import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleTrip } from './vehicle-trip';

describe('VehicleTrip', () => {
  let component: VehicleTrip;
  let fixture: ComponentFixture<VehicleTrip>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleTrip]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleTrip);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
