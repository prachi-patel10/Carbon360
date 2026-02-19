import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterRoleComponent } from './role';

describe('Role', () => {
  let component: MasterRoleComponent;
  let fixture: ComponentFixture<MasterRoleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterRoleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterRoleComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
