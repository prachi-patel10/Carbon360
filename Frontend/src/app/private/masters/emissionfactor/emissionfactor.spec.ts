import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Emissionfactor } from './emissionfactor';

describe('Emissionfactor', () => {
  let component: Emissionfactor;
  let fixture: ComponentFixture<Emissionfactor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Emissionfactor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Emissionfactor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
