import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeMaster } from './tree-master';

describe('TreeMaster', () => {
  let component: TreeMaster;
  let fixture: ComponentFixture<TreeMaster>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeMaster]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreeMaster);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
