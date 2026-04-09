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
plannedCount: t.treeCount ?? 0,
    finalCount: t.treeCount, // default
    total: t.co2PerTree * t.treeCount
  }))
);

      this.calculateSummary();
    },
    error: () => Swal.fire('Error', 'Planned data not found', 'error')
  });
}

updateTree(index: number) {
  const trees = [...this.addedTrees()];
  const item = { ...trees[index] };

  // fallback safety
  if (!item.finalCount) {
    item.finalCount = item.plannedCount;
  }

  // prevent exceeding planned
  if (item.finalCount > item.plannedCount) {
    item.finalCount = item.plannedCount;
    Swal.fire('Warning', 'Cannot exceed planned count');
  }

  item.total = item.finalCount * item.co2;

  trees[index] = item;
  this.addedTrees.set(trees);

  this.calculateSummary();
}

calculateSummary() {
  const trees = this.addedTrees();

  const totalActual = trees.reduce((sum, t) => sum + t.total, 0);
  const totalTreeCount = trees.reduce((sum, t) => sum + t.finalCount, 0);

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

  const newTree = {
    treeId: res.treeId,
    treeName: res.treeName,
    co2: res.co2PerTree,
    plannedCount: res.treeCount ?? 0,
    finalCount: res.treeCount,
    total: res.totalCo2
  };

  const tempList = [...this.addedTrees(), newTree];

  const totalActual = tempList.reduce((sum, t) => sum + t.total, 0);

  // ✅ CHECK TARGET LIMIT
  if (!this.isWithinTarget(totalActual)) {
    Swal.fire('Error', 'Adding this tree exceeds target CO₂e limit');
    return;
  }

  // ✅ allow add
  this.addedTrees.set(tempList);

  Swal.fire({
    icon: 'success',
    title: 'Tree added',
    timer: 1200,
    showConfirmButton: false
  });

  this.calculateSummary();

  this.selectedTreeId = null;
  this.treeCount = 0;
},
      error: (err) => {
        console.error('API ERROR', err);
        Swal.fire('Error', 'Failed to get tree details', 'error');
      }
    });
}
 
isWithinTarget(newTotal: number): boolean {
  const target = this.summary().targetCo2;
  return target === 0 || newTotal <= target;
}
  // ================= SAVE =================
 finalSave() {
  const projectId = this.form.value.projectId;

  const payload = {
    projectId: String(projectId),
    entryBy: 16,
    trees: this.addedTrees().map(t => ({
      treeId: t.treeId,
      treeCount: t.finalCount // ✅ FINAL VALUE
    }))
  };

  this.service.saveFinalEntry(payload).subscribe({
    next: () => {
      Swal.fire('Success', 'Final Entry Saved', 'success');
      this.reset();
    },
    error: () => Swal.fire('Error', 'Save failed', 'error')
  });
}

 onCountChange(index: number, value: number) {
  const trees = [...this.addedTrees()];
  const item = { ...trees[index] };

  const newCount = Number(value) || 0;

  // prevent exceeding planned count
  if (newCount > item.plannedCount) {
    Swal.fire('Warning', 'Cannot exceed planned count');
    return;
  }

  // calculate new total for this item
  const newItemTotal = newCount * item.co2;

  // calculate total if this update is applied
  const tempTrees = [...trees];
  tempTrees[index] = { ...item, finalCount: newCount, total: newItemTotal };

  const totalActual = tempTrees.reduce((sum, t) => sum + (t.finalCount * t.co2), 0);

  // ✅ CHECK TARGET LIMIT
  if (!this.isWithinTarget(totalActual)) {
    Swal.fire('Error', 'Achievement exceeds target CO₂e limit');
    return; // ❌ block update
  }

  // ✅ apply update
  item.finalCount = newCount;
  item.total = newItemTotal;

  trees[index] = item;
  this.addedTrees.set(trees);

  this.calculateSummary();
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