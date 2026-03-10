import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleTripDetail } from './vehicle-trip-detail';

describe('VehicleTripDetail', () => {
  let component: VehicleTripDetail;
  let fixture: ComponentFixture<VehicleTripDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleTripDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleTripDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
