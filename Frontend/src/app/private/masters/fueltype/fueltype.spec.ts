import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fueltype } from './fueltype';

describe('Fueltype', () => {
  let component: Fueltype;
  let fixture: ComponentFixture<Fueltype>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fueltype]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fueltype);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
