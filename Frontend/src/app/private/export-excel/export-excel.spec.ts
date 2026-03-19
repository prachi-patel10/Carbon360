import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportExcel } from './export-excel';

describe('ExportExcel', () => {
  let component: ExportExcel;
  let fixture: ComponentFixture<ExportExcel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportExcel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportExcel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
