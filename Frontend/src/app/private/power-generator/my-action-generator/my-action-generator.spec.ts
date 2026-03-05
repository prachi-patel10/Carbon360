import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyActionGenerator } from './my-action-generator';

describe('MyActionGenerator', () => {
  let component: MyActionGenerator;
  let fixture: ComponentFixture<MyActionGenerator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyActionGenerator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyActionGenerator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
