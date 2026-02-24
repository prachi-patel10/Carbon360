import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartmentComponent } from './department';

describe('Department', () => {
  let component: DepartmentComponent;
  let fixture: ComponentFixture<DepartmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepartmentComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
