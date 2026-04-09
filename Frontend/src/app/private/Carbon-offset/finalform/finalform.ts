import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { FinalformService } from './finalform-service';

@Component({
  selector: 'app-final-entry',
  templateUrl: './finalform.html',
  styleUrls: ['./finalform.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class FinalEntryComponent implements OnInit {

  form!: FormGroup;
financialYearRange: string = '';
years: number[] = [];
  projects: any[] = [];

  treeInputs: any[] = [];


treeMaster: any[] = [];

selectedTreeId: any = '';
treeCount: number = 0;
totalOffset :number = 0;
addedTrees = signal<any[]>([]);

  // ✅ LIST
  entries = signal<any[]>([]);
  treeInputsSignal = signal<any[]>([]);
  remainingEmission = signal(0);
  status = signal('');
  totalRecords = signal(0);

  // ✅ SUMMARY
summary = signal({
  targetCo2: 0,
  totalTreeCount: 0,
  totalCo2Absorption: 0,
  actualAchievement: 0
});

  constructor(
    private fb: FormBuilder,
    private service: FinalformService,
    
  ) {}

  ngOnInit(): void {
  this.form = this.fb.group({
    projectId: [''],
  });

  this.loadProjects(); 
  this.loadTreeMaster(); // ✅ first load data
  this.form.get('projectId')?.valueChanges.subscribe((projectId) => {
  if (projectId) {
    this.onProjectChange();
  }
});
}


onProjectChange() {
  const projectId = this.form.value.projectId;
    console.log("PROJECT CHANGED:", projectId); // 👈 check this

  if (!projectId) return;

  this.service.getPlannedData(projectId).subscribe({
    next: (res: any) => {
console.log("API RESPONSE:", res);
      // ✅ SET TARGET
      this.summary.set({
        ...this.summary(),
        targetCo2: res.totalOffset || 0
      });

      // ✅ LOAD PLANNED TREES
      this.addedTrees.set(
        (res.trees || []).map((t: any) => ({
          treeId: t.treeId,
          treeName: t.treeName,
          co2: t.co2PerTree,
          count: t.treeCount,
          total: t.co2PerTree * t.treeCount
        }))
      );

      this.calculateSummary();
    },
    error: () => Swal.fire('Error', 'Planned data not found', 'error')
  });
}

calculateSummary() {
  const trees = this.addedTrees();

  const totalActual = trees.reduce((sum, t) => sum + t.total, 0);
  const totalTreeCount = trees.reduce((sum, t) => sum + t.count, 0);

  this.summary.update(s => ({
    ...s,
    totalTreeCount: totalTreeCount,
    totalCo2Absorption: totalActual,
    actualAchievement:
      s.targetCo2 > 0
        ? Math.round((totalActual / s.targetCo2) * 100)
        : 0
  }));

  this.totalOffset = totalActual;
}
  // ================= TREE MASTER =================
 loadTreeMaster() {
  this.service.getTreeMaster().subscribe({
    next: (res: any) => {
      const trees = res?.data || [];

      this.treeMaster = trees.map((t: any) => ({
  treeId: t.treeId || t.TreeId,   // 🔥 keep encrypted
  rawId: t.id || t.treeIdRaw || t.TreeIdRaw, // if available
  treeName: t.treeName,
  co2: t.co2AbsorptionPerYear
}));
    },
    error: () => Swal.fire('Error', 'Tree not loading', 'error'),
  });
}

addTree() {
  console.log('CLICKED', this.selectedTreeId, this.treeCount);

  // ✅ Validation
  if (!this.selectedTreeId || !this.treeCount) {
    Swal.fire('Error', 'Select tree and enter count', 'error');
    return;
  }

  // ✅ Prevent duplicate tree
  const exists = this.addedTrees().find(
    t => t.treeId === this.selectedTreeId
  );

  if (exists) {
    Swal.fire('Error', 'Tree already added', 'error');
    return;
  }

  // ✅ Call API for tree calculation
  this.service.getTreeDetails(this.selectedTreeId, this.treeCount)
    .subscribe({
      next: (res: any) => {

        // ✅ Add to list
        this.addedTrees.update(list => [
          ...list,
          {
            treeId: res.treeId,
            treeName: res.treeName,
            co2: res.co2PerTree,
            count: res.treeCount,
            total: res.totalCo2
          }
        ]);

        Swal.fire({
          icon: 'success',
          title: 'Tree added',
          timer: 1200,
          showConfirmButton: false
        });

        // ✅ Recalculate summary (IMPORTANT 🔥)
        this.calculateSummary();

        // ✅ Reset input
        this.selectedTreeId = null;
        this.treeCount = 0;
      },
      error: (err) => {
        console.error('API ERROR', err);
        Swal.fire('Error', 'Failed to get tree details', 'error');
      }
    });
}
 
  // ================= SAVE =================
 finalSave() {
  const projectId = this.form.value.projectId;

  if (!projectId) {
    Swal.fire('Error', 'Select Project', 'error');
    return;
  }

  if (this.addedTrees().length === 0) {
    Swal.fire('Error', 'Add at least one tree', 'error');
    return;
  }

  const payload = {
    projectId: String(projectId),
    entryBy: 16, // 🔥 replace with logged-in user
    trees: this.addedTrees().map(t => ({
      treeId: t.treeId,
      treeCount: t.count
    }))
  };

  this.service.saveFinalEntry(payload).subscribe({
    next: (res: any) => {
      Swal.fire('Success', 'Final Entry Saved', 'success');

      this.reset();
    },
    error: () => Swal.fire('Error', 'Save failed', 'error')
  });
}


  onCountChange(index: number, event: any) {
  const trees = [...this.treeInputsSignal()];
  const item = { ...trees[index] };           // ✅ spread — never mutate directly

  item.count = Number(event.target.value) || 0; // ✅ read from DOM event
  item.total = item.count * item.co2;

  trees[index] = item;                          // ✅ replace object in array
  this.treeInputsSignal.set(trees);             // ✅ signal now has real count

  const totalOffset = trees.reduce((sum, t) => sum + (t.total || 0), 0);
  // this.totalOffset.set(totalOffset);

}

removeTree(index: number) {
  this.addedTrees.update(list => {
    const updated = [...list];
    updated.splice(index, 1);
    return updated;
  });

  this.calculateSummary();
}
  // ================= RESET =================
reset() {
  this.form.reset();
  this.addedTrees.set([]);
  this.totalOffset = 0;

  this.summary.set({
    targetCo2: 0,
    totalTreeCount: 0,
    totalCo2Absorption: 0,
    actualAchievement: 0
  });

  
}

loadProjects() {
  this.service.getUserProjects().subscribe({
    next: (res: any) => {
      this.projects = res || [];

      console.log("Projects:", this.projects); // ✅ debug

    
    },
    error: () => {
      this.projects = [];
      Swal.fire('Error', 'Projects not loading', 'error');
    }
  });
}

  
}