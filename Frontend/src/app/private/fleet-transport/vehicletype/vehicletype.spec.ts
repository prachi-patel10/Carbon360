import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Vehicletype } from './vehicletype';

describe('Vehicletype', () => {
  let component: Vehicletype;
  let fixture: ComponentFixture<Vehicletype>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Vehicletype]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Vehicletype);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
