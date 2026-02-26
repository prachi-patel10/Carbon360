import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Citymaster } from './citymaster';

describe('Citymaster', () => {
  let component: Citymaster;
  let fixture: ComponentFixture<Citymaster>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Citymaster]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Citymaster);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
