import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleEC } from './vehicle-ec';

describe('VehicleEC', () => {
  let component: VehicleEC;
  let fixture: ComponentFixture<VehicleEC>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleEC]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleEC);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
