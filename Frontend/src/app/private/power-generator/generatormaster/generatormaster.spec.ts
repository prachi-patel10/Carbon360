import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Generatormaster } from './generatormaster';

describe('Generatormaster', () => {
  let component: Generatormaster;
  let fixture: ComponentFixture<Generatormaster>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Generatormaster]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Generatormaster);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
