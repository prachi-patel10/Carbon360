import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup ,ReactiveFormsModule } from '@angular/forms';
import { FinalformService } from './finalform-service';

@Component({
  selector: 'app-final-entry',
  templateUrl: './finalform.html',
  styleUrls: ['./finalform.css'],
   imports: [
    ReactiveFormsModule
  ]
})
export class FinalEntryComponent implements OnInit {

  form!: FormGroup;

  years = ['2024-25', '2025-26'];
  projects: any[] = [];
  treeMaster: any[] = [];

  selectedTreeId: number | null = null;
  treeCount: number = 0;

  addedTrees: any[] = [];

  plannedSummary: any;
  totalCO2 = 0;
  achievement = 0;

  constructor(private fb: FormBuilder, private service: FinalformService) {}

  ngOnInit() {
    this.form = this.fb.group({
      year: [''],
      projectId: [''],
      remarks: ['']
    });

    this.loadProjects();
    this.loadTreeMaster();
  }

  loadProjects() {
    this.service.getProjects().subscribe(res => this.projects = res);
  }

  loadTreeMaster() {
    this.service.getTrees().subscribe(res => this.treeMaster = res);
  }

  loadPlannedData() {
    const { year, projectId } = this.form.value;
    if (!year || !projectId) return;

    this.service.getPlannedSummary(year, projectId).subscribe(res => {
      this.plannedSummary = res;
      this.calculateAchievement();
    });
  }

  addTree() {
  if (!this.selectedTreeId || this.treeCount <= 0) return;

  const tree = this.treeMaster.find(t => t.treeId === this.selectedTreeId);

  if (!tree) return; // ✅ IMPORTANT FIX

  const total = tree.co2 * this.treeCount;

  this.addedTrees.push({
    treeName: tree.treeName,
    co2: tree.co2,
    count: this.treeCount,
    total
  });

  this.selectedTreeId = null;
  this.treeCount = 0;

  this.calculateTotals();
}

  removeTree(index: number) {
    this.addedTrees.splice(index, 1);
    this.calculateTotals();
  }

  calculateTotals() {
    this.totalCO2 = this.addedTrees.reduce((sum, t) => sum + t.total, 0);
    this.calculateAchievement();
  }

  calculateAchievement() {
    if (!this.plannedSummary) return;

    const planned = this.plannedSummary.totalCO2 || 1;
    this.achievement = Math.round((this.totalCO2 / planned) * 100);
  }

  saveDraft() {
    const payload = this.getPayload('Draft');
    this.service.saveEntry(payload).subscribe();
  }

  finalSubmit() {
    const payload = this.getPayload('Final');
    this.service.saveEntry(payload).subscribe();
  }

  getPayload(status: string) {
    return {
      ...this.form.value,
      trees: this.addedTrees,
      totalCO2: this.totalCO2,
      achievement: this.achievement,
      status
    };
  }

  
}