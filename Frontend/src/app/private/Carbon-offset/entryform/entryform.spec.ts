import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Entryform } from './entryform';

describe('Entryform', () => {
  let component: Entryform;
  let fixture: ComponentFixture<Entryform>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Entryform]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Entryform);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
