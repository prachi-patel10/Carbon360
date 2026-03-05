import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyActionVehicle } from './my-action-vehicle';

describe('MyActionVehicle', () => {
  let component: MyActionVehicle;
  let fixture: ComponentFixture<MyActionVehicle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyActionVehicle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyActionVehicle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
