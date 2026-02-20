import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterUserComponent } from './user';

describe('User', () => {
  let component: MasterUserComponent;
  let fixture: ComponentFixture<MasterUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterUserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterUserComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
