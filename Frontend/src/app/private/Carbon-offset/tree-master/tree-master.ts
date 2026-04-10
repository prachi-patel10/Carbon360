import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MasterTreeService, MasterTree } from './master-tree-service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-master-tree',
  templateUrl: './tree-master.html',
  styleUrls: ['./treemaster.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class MasterTreeComponent implements OnInit {

  treeForm!: FormGroup;
  searchForm!: FormGroup;

  // ✅ SIGNALS (same as department)
  trees = signal<MasterTree[]>([]);
  totalRecords = signal(0);
  totalPages = signal(1);
  currentPage = signal(1);
  requestedRecords = signal(5);
  onlyActive = signal<boolean>(true);
  searchText = signal('');

  sortColumn = 'TreeName';
  sortDirection: 'asc' | 'desc' = 'asc';

  pageSizeOptions = [5, 10, 20];
  isUserSorting=false;

  constructor(
    private fb: FormBuilder,
    private service: MasterTreeService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadTrees();
  }

  // ================= FORMS =================
  initForms() {
    this.treeForm = this.fb.group({
      TreeId: [''],
      TreeName: ['', Validators.required],
      Co2AbsorptionPerYear: [0, Validators.required],
      IsActive: [true],
    });

    this.searchForm = this.fb.group({
      searchText: [''],
    });

    // 🔍 LIVE SEARCH
    this.searchForm.get('searchText')?.valueChanges.subscribe(val => {
      this.searchText.set(val || '');
      this.currentPage.set(1);
      this.loadTrees();
    });
  }

  // ================= LOAD =================
 loadTrees() {
  this.service.getPaged(
    this.currentPage(),
    this.requestedRecords(),
    this.searchText(),
    this.onlyActive(),
    this.isUserSorting ? this.sortColumn : '',     // ✅ apply only if user sorts
    this.isUserSorting ? this.sortDirection : ''   // ✅ else no sorting
  ).subscribe({
    next: (res: any) => {

      const mapped = res.data.map((t: any) => ({
        TreeId: t.treeId,
        TreeName: t.treeName,
        Co2AbsorptionPerYear: t.co2AbsorptionPerYear,
        IsActive: t.isActive
      }));

      this.trees.set(mapped);
      this.totalRecords.set(res.totalRecords);
      this.totalPages.set(res.totalPages);
    },
    error: () => alert('Failed to load trees')
  });
}
  // ================= SORT =================
sort(column: string) {

  this.isUserSorting = true;  // ✅ IMPORTANT

  if (this.sortColumn === column)
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  else {
    this.sortColumn = column;
    this.sortDirection = 'asc';
  }

  this.loadTrees();
}
  getSortIcon(column: string) {
  if (!this.isUserSorting) return '';   // ✅ no icon initially
  if (this.sortColumn !== column) return '↕';
  return this.sortDirection === 'asc' ? '↑' : '↓';
}
  // ================= PAGINATION =================
  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadTrees();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadTrees();
    }
  }

  onRecordsChange(event: any) {
    this.requestedRecords.set(+event.target.value);
    this.currentPage.set(1);
    this.loadTrees();
  }

  // ================= ACTIVE FILTER =================
  onActiveFilterChange(e: any) {
    this.onlyActive.set(e.target.checked);
    this.currentPage.set(1);
    this.loadTrees();
  }

  // ================= SUBMIT =================
submitTree() {

  if (this.treeForm.invalid) {
    this.treeForm.markAllAsTouched();
    return;
  }

  const data = this.treeForm.value;
  const isCreate = !data.TreeId;

  const obs = isCreate
    ? this.service.create(data)
    : this.service.update(data);

  obs.subscribe({
    next: () => {

      Swal.fire(
        'Success',
        isCreate ? 'Created successfully' : 'Updated successfully',
        'success'
      );

      // ✅ RESET SORTING
      this.isUserSorting = false;
      this.sortColumn = '';
      this.sortDirection = 'desc';

      this.loadTrees();
      this.resetForm();
    },
    error: () => Swal.fire('Error', 'Operation failed', 'error')
  });
}

  edit(tree: MasterTree) {
    this.treeForm.patchValue(tree);
  }

  deleteUI(tree: MasterTree) {
  Swal.fire({
    title: 'Are you sure?',
    icon: 'warning',
    showCancelButton: true
  }).then(res => {

    if (res.isConfirmed) {

      this.service.delete(tree.TreeId).subscribe({
        next: () => {

          // ✅ REMOVE FROM SIGNAL (INSTANT UI UPDATE)
          this.trees.update(list =>
            list.filter(t => t.TreeId !== tree.TreeId)
          );

          // ✅ OPTIONAL (refresh pagination data)
          this.totalRecords.update(v => v - 1);

          Swal.fire('Deleted!', 'Tree deleted successfully', 'success');
        },
        error: () => {
          Swal.fire('Error', 'Delete failed', 'error');
        }
      });
      this.trees.update(list => {
  const updated = list.filter(t => t.TreeId !== tree.TreeId);
  console.log('After delete:', updated);
  return updated;
});

    }

  });
}
  toggleActive(tree: MasterTree) {
    this.service.toggleActive(tree.TreeId).subscribe(() => {
      this.loadTrees();
    });
  }

  resetForm() {
    this.treeForm.reset({
      TreeId: '',
      TreeName: '',
      Co2AbsorptionPerYear: 0,
      IsActive: true
    });
  }
}