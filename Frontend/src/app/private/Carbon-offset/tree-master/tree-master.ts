import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MasterTreeService } from './master-tree-service'; // <-- backend service
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-master-tree',
  templateUrl: './tree-master.html',
  styleUrls: ['./treemaster.css'],
  imports:[ReactiveFormsModule,CommonModule]
})
export class MasterTreeComponent implements OnInit {

  treeForm!: FormGroup;
  searchForm!: FormGroup;

  treeList: any[] = [];
  filteredList: any[] = [];

  currentPageNum = 1;
  pageSizeOptions = [5,10,20,50];
  requestedSize = 10;

  sortColumn = '';
  sortDirection: 'asc'|'desc' = 'asc';

  constructor(private fb: FormBuilder, private treeService: MasterTreeService) {}

  ngOnInit(): void {
    this.treeForm = this.fb.group({
      TreeId: [0],
      TreeName: ['', Validators.required],
      co2AbsorptionPerYear: [0, Validators.required],
      IsActive: [true]
    });

    this.searchForm = this.fb.group({
      searchText: ['']
    });

    this.loadTrees();

    this.searchForm.get('searchText')?.valueChanges.subscribe(val => {
      this.filterTrees();
    });
  }

  loadTrees() {
    this.treeService.getTrees().subscribe((res: any[]) => {
      this.treeList = res;
      this.filterTrees();
    });
  }

  filterTrees() {
    const val = this.searchForm.get('searchText')?.value?.toLowerCase() || '';
    this.filteredList = this.treeList.filter(t =>
      t.TreeName.toLowerCase().includes(val)
    );
  }

  trees() {
    let list = [...this.filteredList];
    if(this.sortColumn) {
      list.sort((a:any,b:any) => {
        const x = a[this.sortColumn];
        const y = b[this.sortColumn];
        if(x < y) return this.sortDirection==='asc'? -1:1;
        if(x > y) return this.sortDirection==='asc'? 1:-1;
        return 0;
      });
    }
    return list.slice((this.currentPageNum-1)*this.requestedSize, this.currentPageNum*this.requestedSize);
  }

  totalRecords() { return this.filteredList.length; }
  currentPage() { return this.currentPageNum; }
  totalPages() { return Math.ceil(this.filteredList.length/this.requestedSize); }
  requestedRecords() { return this.requestedSize; }

  onRecordsChange(e:any) {
    this.requestedSize = +e.target.value;
  }
  previousPage() { if(this.currentPageNum>1) this.currentPageNum--; }
  nextPage() { if(this.currentPageNum<this.totalPages()) this.currentPageNum++; }


sort(column: string) {
  if (this.sortColumn === column)
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  else {
    this.sortColumn = column;
    this.sortDirection = 'asc';
  }

  const sorted = [...this.treeList].sort((a: any, b: any) => {
    let valA = a[column] ?? '';
    let valB = b[column] ?? '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  this.treeList = sorted;
}

getSortIcon(column: string) {
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  submitTree() {
    if(this.treeForm.invalid) return;

    const data = this.treeForm.value;
    if(data.TreeId === 0) {
      this.treeService.addTree(data).subscribe(res=> this.loadTrees());
    } else {
      this.treeService.updateTree(data).subscribe(res=> this.loadTrees());
    }
    this.resetForm();
  }

  resetForm() {
    this.treeForm.reset({ TreeId: 0, TreeName:'', co2AbsorptionPerYear:0, IsActive:true });
  }

  edit(tree:any) {
    this.treeForm.patchValue(tree);
  }

  deleteUI(tree:any) {
    if(confirm('Are you sure to delete this tree?')) {
      this.treeService.deleteTree(tree.TreeId).subscribe(res => this.loadTrees());
    }
  }

  onlyActive() { return false; } // implement if needed
  onActiveFilterChange(e:any) {} // implement if needed
  toggleActive(tree:any) {} // implement if needed
}