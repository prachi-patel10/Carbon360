import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sitelocationmaster } from './sitelocationmaster';

describe('Sitelocationmaster', () => {
  let component: Sitelocationmaster;
  let fixture: ComponentFixture<Sitelocationmaster>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sitelocationmaster]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sitelocationmaster);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
