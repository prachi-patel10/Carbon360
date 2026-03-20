import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleCharts } from './vehicle-charts';

describe('VehicleCharts', () => {
  let component: VehicleCharts;
  let fixture: ComponentFixture<VehicleCharts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleCharts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleCharts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
