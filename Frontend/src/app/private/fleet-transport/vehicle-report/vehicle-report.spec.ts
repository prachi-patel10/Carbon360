import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleReport } from './vehicle-report';

describe('VehicleReport', () => {
  let component: VehicleReport;
  let fixture: ComponentFixture<VehicleReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleReport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
