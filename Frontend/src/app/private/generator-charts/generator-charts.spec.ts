import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneratorCharts } from './generator-charts';

describe('GeneratorCharts', () => {
  let component: GeneratorCharts;
  let fixture: ComponentFixture<GeneratorCharts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneratorCharts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneratorCharts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
