import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-finalform',
  imports: [CommonModule,ReactiveFormsModule,FormsModule],
  templateUrl: './finalform.html',
  styleUrl: './finalform.css',
})
export class Finalform {
projects: any[] = [];
treeList: any[] = [];   // from planner
addedTrees: any[] = [];

selectedProjectId: number = 0;
selectedTreeId: number = 0;
treeCount: number = 0;

totalOffset: number = 0;


onProjectChange() {
//   this.http.get(`api/projectTrees/${this.selectedProjectId}`)
//     .subscribe((res: any) => {
//       this.treeList = res;
//     });
}

addTree() {

  let tree = this.treeList.find(t => t.treeId == this.selectedTreeId);

  if (!tree) return;

  // 🔥 VALIDATION
  if (this.treeCount > tree.totalTrees) {
    alert("Cannot select more than available trees");
    return;
  }

  let existing = this.addedTrees.find(t => t.treeId == tree.treeId);

  if (existing) {
    existing.selected += this.treeCount;
  } else {
    this.addedTrees.push({
      treeId: tree.treeId,
      treeName: tree.treeName,
      co2: tree.co2,
      totalTrees: tree.totalTrees,
      selected: this.treeCount,
      remaining: tree.totalTrees - this.treeCount,
      totalCo2: this.treeCount * tree.co2
    });
  }

  // 🔥 UPDATE REMAINING IN MASTER LIST
  tree.totalTrees -= this.treeCount;

  this.calculateTotal();

  // RESET
  this.treeCount = 0;
  this.selectedTreeId = 0;
}


calculateTotal() {
  this.totalOffset = 0;

  this.addedTrees.forEach(t => {
    t.totalCo2 = t.selected * t.co2;
    t.remaining = t.totalTrees - t.selected;

    this.totalOffset += t.totalCo2;
  });

}
}
