import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { ReportService } from './entryformservice';

@Component({
  selector: 'app-entryform',
  standalone: true,
  templateUrl: './entryform.html',
  styleUrls: ['./entryform.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class EntryFormComponent implements OnInit {
  form!: FormGroup;
financialYearRange: string = '';
years: number[] = [];
  projects: any[] = [];
draftId: number = 0;
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
  previousYearEmission: 0,
  totalTreeCount: 0,
  totalCo2Absorption: 0,
  actualAchievement: 0
});

  constructor(
    private fb: FormBuilder,
    private service: ReportService,
    
  ) {}

  ngOnInit(): void {
  this.form = this.fb.group({
    year: [''],
    projectId: [''],
  });

  this.generateYears();



  this.loadTreeMaster(); // ✅ first load data

  this.onYearChange();

  
}

  // ================= PROJECT =================
onYearChange() {
  const year = Number(this.form.value.year);

  if (!year) {
    this.projects = [];
    this.summary.set({
      previousYearEmission: 0,
      totalTreeCount: 0,
      totalCo2Absorption: 0,
      actualAchievement: 0
    });
    return;
  }

  // Reset emission immediately so UI shows 0 while API loads
  this.summary.set({
    ...this.summary(),
    previousYearEmission: 0
  });

  this.service.getProjectsByYear(year).subscribe({
    next: (res: any) => {
      this.projects = res || [];

      // ✅ Take first project emission as default
      const emission = this.projects[0]?.previousYearEmission ?? 0;

      this.summary.set({
        ...this.summary(),
        previousYearEmission: emission
      });

      // Reset project selection in form
      this.form.patchValue({ projectId: '' });

      this.calculateSummary();
    },
    error: () => {
      this.projects = [];
      this.summary.set({
        ...this.summary(),
        previousYearEmission: 0
      });
      Swal.fire('Error', 'Projects not loading', 'error');
    }
  });
}
onProjectChange() {
  const selectedId = this.form.value.projectId;
  console.log("Selected ProjectId:", selectedId);
  const project = this.projects.find(p => p.projectId == selectedId);
  if (project) {
    this.summary.set({
      ...this.summary(),
      previousYearEmission: project.previousYearEmission || 0
    });
    this.calculateSummary();
  }
}

calculateSummary() {
  const trees = this.addedTrees();

  const totalOffset = trees.reduce((sum, t) => sum + t.total, 0);
  const totalTreeCount = trees.reduce((sum, t) => sum + t.count, 0);

  this.summary.update(s => ({
    ...s,
    totalTreeCount: totalTreeCount,
    totalCo2Absorption: totalOffset,
    actualAchievement:
      s.previousYearEmission > 0
        ? Math.round((totalOffset / s.previousYearEmission) * 100)
        : 0
  }));

  this.totalOffset = totalOffset;
}

loadEntriesByYear(year: number) {
  this.service.getEntries(1, 10, '', year).subscribe((res: any) => {

    this.entries.set(res.data || []);
    this.totalRecords.set(res.totalRecords || 0);

    if (res.summary()) {
      this.summary().previousYearEmission = res.summary().previousYearEmission || 0;
      this.summary().totalTreeCount = res.summary().totalTreeCount || 0;
      this.summary().totalCo2Absorption = res.summary().totalCo2Absorption || 0;
      this.summary().actualAchievement = res.summary().actualAchievement || 0;

      // Optional (for your existing logic)
      this.remainingEmission.set(this.summary().previousYearEmission);
      this.status.set('Pending');
    }
  });
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
  if (!this.selectedTreeId || !this.treeCount) {
    Swal.fire('Error', 'Select tree and enter count', 'error');
    return;
  }

  const exists = this.addedTrees().find(
    t => t.treeId === this.selectedTreeId
  );

  if (exists) {
    Swal.fire('Error', 'Tree already added', 'error');
    return;
  }

  // ✅ GET TREE FROM MASTER (NO API)
  const selectedTree = this.treeMaster.find(
    t => t.treeId === this.selectedTreeId
  );

  if (!selectedTree) {
    Swal.fire('Error', 'Tree not found', 'error');
    return;
  }

  const total = selectedTree.co2 * this.treeCount;

  // ✅ STORE LOCALLY ONLY
  this.addedTrees.update(list => [
    ...list,
    {
      treeId: selectedTree.treeId,
      treeName: selectedTree.treeName,
      co2: selectedTree.co2,
      count: this.treeCount,
      total: total
    }
  ]);

  // ✅ UPDATE SUMMARY
  this.calculateSummary();

  // RESET INPUT
  this.selectedTreeId = null;
  this.treeCount = 0;

  Swal.fire({
    icon: 'success',
    title: 'Added successfully',
    timer: 1200,
    showConfirmButton: false
  });
}
 // ================= YEARS =================
generateYears() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // ✅ Current Financial Year End
  const currentFYEnd = month >= 4 ? year + 1 : year;

  this.years = [];

  for (let i = 0; i < 10; i++) {
    this.years.push(currentFYEnd + i); // ✅ only 2027, 2028...
  }
}
  // ================= SAVE =================
 finalSave() {
  const projectId = this.form.value.projectId;
  const year = this.form.value.year;

  if (!projectId || !year) {
    Swal.fire('Error', 'Select Year & Project', 'error');
    return;
  }

  if (this.addedTrees().length === 0) {
    Swal.fire('Error', 'Add at least one tree', 'error');
    return;
  }

  const payload = {
    offsetEntryId: this.draftId || 0,   // ✅ allow direct save
    projectId: String(projectId),
    financialYear: year,
    trees: this.addedTrees().map(t => ({
      treeId: t.treeId,
      treeCount: t.count
    }))
  };

  console.log("FINAL PAYLOAD:", payload);

  this.service.saveOffsetEntry(payload).subscribe({
    next: (res: any) => {
      Swal.fire('Success', `Saved Successfully. Total Offset: ${res.totalOffset}`, 'success');

      // ✅ RESET
      this.draftId = 0;
      this.addedTrees.set([]);
      this.totalOffset = 0;

      this.summary.set({
        previousYearEmission: 0,
        totalTreeCount: 0,
        totalCo2Absorption: 0,
        actualAchievement: 0
      });
    },
    error: () => Swal.fire('Error', 'Final save failed', 'error')
  });
}
// saveAll() {
//     console.log('counts:', this.treeInputsSignal().map(t => t.count));

//   const projectId = this.form.value.projectId;

//   if (!projectId) {
//     Swal.fire('Error', 'Select project first', 'error');
//     return;
//   }

//   const selectedTrees = this.treeInputsSignal()
//     .filter(t => t.count > 0)
//     .map(t => ({
//       treeId: t.treeId,
//       treeCount: Number(t.count),
//       totalOffset: Number(t.count) * t.co2   // ✅ ADD THIS
//     }));

//   if (selectedTrees.length === 0) {
//     Swal.fire('Error', 'Enter at least one tree count', 'error');
//     return;
//   }

//   const grandTotalOffset = this.totalOffset();  // ✅ already calculated

//   const payload = {
//     projectId: projectId,
//       totalOffset: this.totalOffset(),              // ✅ ADD THIS (grand total)
//     trees: selectedTrees
//   };

//   this.service.saveOffsetEntry(payload).subscribe({
//   next: () => {
//     Swal.fire('Success', 'Saved successfully', 'success');

//     // ✅ reset tree counts only
//     this.treeInputsSignal.update(trees =>
//       trees.map(t => ({ ...t, count: 0, total: 0 }))
//     );

   
//     // ✅ recalc remainingEmission after adding this save
//     const newRemaining = this.summary().totalEmission - this.totalOffset();
//     this.remainingEmission.set(newRemaining);
//     this.status.set(newRemaining <= 0 ? 'Achieved' : 'Pending');

//     this.loadEntriesByYear(Number(this.form.value.year)); // reload entries for selected year
//   },
//   error: () => Swal.fire('Error', 'Save failed', 'error')
// });
// }

saveDraft() {
  const projectId = this.form.value.projectId;
  const year = this.form.value.year;

  if (!projectId || !year) {
    Swal.fire('Error', 'Select Year & Project', 'error');
    return;
  }

  if (this.addedTrees().length === 0) {
    Swal.fire('Error', 'Add at least one tree', 'error');
    return;
  }

  const payload = {
    offsetEntryId: 0, // no dependency
    projectId: String(projectId),
    entryBy: 'CurrentUser',
    financialYear: year,   // ✅ ADD THIS
    trees: this.addedTrees().map(t => ({
      treeId: t.treeId,
      treeCount: t.count
    }))
  };

  this.service.saveDraft(payload).subscribe({
    next: (res: any) => {

      // ✅ OPTIONAL: store draft id (only if you want edit later)
      this.draftId = res.offsetEntryId;

      Swal.fire('Draft Saved', `Draft ID: ${this.draftId}`, 'success');
    },
    error: () => Swal.fire('Error', 'Draft save failed', 'error')
  });
}
  // ================= LOAD LIST + SUMMARY =================
  // loadEntries() {
  //   this.service.getEntries(1, 10, '').subscribe((res: any) => {
  //     this.entries.set(res.data || []);
  //     this.totalRecords.set(res.totalRecords || 0);

  //     // ✅ SUMMARY FIX
  //     if (res.summary()) {
  //       this.summary().totalEmission = res.summary().totalEmission || 0;
  //       this.summary().totalOffset = res.summary().totalOffset || 0;
  //       this.summary().remainingEmission = res.summary().remainingEmission || 0;
  //       this.summary().status = res.summary().status || '';
  //     }
  //   });
  // }

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
  // Recalculate total
 this.totalOffset = this.addedTrees()
  .reduce((sum, t) => sum + t.total, 0);

this.summary().totalTreeCount = this.addedTrees()
  .reduce((sum, t) => sum + t.count, 0);

  this.summary().totalCo2Absorption = this.totalOffset;

  this.summary().actualAchievement =
    this.summary().previousYearEmission > 0
      ? Math.round((this.totalOffset / this.summary().previousYearEmission) * 100)
      : 0;
      this.calculateSummary();
}
  // ================= RESET =================
 reset() {
  this.form.reset();
  this.projects = [];

this.addedTrees.set([]);
  this.totalOffset = 0;

  this.remainingEmission.set(0);
  this.status.set('');
this.summary.set({
  previousYearEmission: 0,
  totalTreeCount: 0,
  totalCo2Absorption: 0,
  actualAchievement: 0
});
  
}
}
