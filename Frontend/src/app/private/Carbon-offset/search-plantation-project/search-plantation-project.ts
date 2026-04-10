import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../enviorments/environment'; // ✅ add this
import { SearchPlantationProjectService, PlantationProjectSearchResult } from './search-plantation-project-service';

@Component({
  selector: 'app-search-plantation-project',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-plantation-project.html',
  styleUrl: './search-plantation-project.css',
})
export class SearchPlantationProject implements OnInit {

  // ── Filters ───────────────────────────────────────────────────
  searchText = signal<string>('');
  selectedFY: string = '';
  fyDropdownOpen = false;

  // ── Data ──────────────────────────────────────────────────────
  records = signal<PlantationProjectSearchResult[]>([]);
  totalRecordsCount = signal<number>(0);
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);

  // ── Pagination / Sort ─────────────────────────────────────────
  pageSize: number = 10;
  sortColumn: string = 'EntryDate';
  sortDirection: string = 'DESC';

  // ── Financial Year options ────────────────────────────────────
  financialYears: string[] = this.generateFYOptions();

  // ── PDF loading state ─────────────────────────────────────────
  loadingPdf: Record<number, boolean> = {};

  constructor(
    private service: SearchPlantationProjectService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadRecords(1);
  }

  generateFYOptions(): string[] {
    const current = new Date().getFullYear();
    const years: string[] = [];
    for (let y = current; y >= current - 6; y--) {
      years.push(`${y}-${y + 1}`);
    }
    return years;
  }

  // ── Dropdown ──────────────────────────────────────────────────
  toggleFYDropdown(): void { this.fyDropdownOpen = !this.fyDropdownOpen; }

  selectFY(fy: string): void {
    this.selectedFY = fy;
    this.fyDropdownOpen = false;
    this.currentPage.set(1);
    this.loadRecords(1);
  }

  clearFY(): void {
    this.selectedFY = '';
    this.fyDropdownOpen = false;
    this.currentPage.set(1);
    this.loadRecords(1);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.fy-multiselect'))
      this.fyDropdownOpen = false;
  }

  // ── Data Loading ──────────────────────────────────────────────
  loadRecords(page: number): void {
    this.service.search(
      page,
      this.pageSize,
      this.sortColumn,
      this.sortDirection,
      this.searchText() || undefined,
      this.selectedFY || undefined
    ).subscribe({
      next: (res: any) => {
        const payload = res.data ?? [];
        const rows = Array.isArray(payload) ? payload : (payload.data ?? []);
        const total = payload.totalRecords ?? rows.length;

        this.records.set(rows);
        this.totalRecordsCount.set(total);
        this.totalPages.set(Math.ceil(total / this.pageSize) || 1);
        this.currentPage.set(page);
      },
      error: err => console.error('Error loading records', err)
    });
  }

  onSearch(event: any): void {
    this.searchText.set(event.target.value);
    this.currentPage.set(1);
    this.loadRecords(1);
  }

  resetFilters(): void {
    this.searchText.set('');
    this.selectedFY = '';
    this.fyDropdownOpen = false;
    this.sortColumn = 'EntryDate';
    this.sortDirection = 'DESC';
    this.currentPage.set(1);
    this.loadRecords(1);
  }

  sort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'ASC';
    }
    this.loadRecords(1);
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '↕';
    return this.sortDirection === 'ASC' ? '↑' : '↓';
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.loadRecords(page);
  }

  changePageSize(event: any): void {
    this.pageSize = Number(event.target.value);
    this.loadRecords(1);
  }

  paginatedData(): PlantationProjectSearchResult[] { return this.records(); }
  totalRecords(): number { return this.totalRecordsCount(); }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'achieved': return 'badge-active';
      case 'pending':  return 'badge-draft';
      default:         return 'badge-default';
    }
  }

  openRecord(id: number): void {
    this.router.navigate(['/dashboard/Ngoentryform', id], {
      queryParams: { mode: 'view' }
    });
  }

  isLoading(id: number): boolean {
    return !!this.loadingPdf[id];
  }

  downloadPdf(offsetEntryId: number): void {
    if (!offsetEntryId) return;
    this.loadingPdf[offsetEntryId] = true;
    const token = localStorage.getItem('token');

    fetch(`${environment.apiBaseUrl}/OffsetEntry/pdf/${offsetEntryId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) return res.text().then(text => { throw new Error(`Server error ${res.status}: ${text}`); });
        return res.blob();
      })
      .then((blob: any) => {
        const now = new Date();
        const ds =
          now.getFullYear().toString() +
          String(now.getMonth() + 1).padStart(2, '0') +
          String(now.getDate()).padStart(2, '0') + '_' +
          String(now.getHours()).padStart(2, '0') +
          String(now.getMinutes()).padStart(2, '0') +
          String(now.getSeconds()).padStart(2, '0');
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `OffsetEntry_${ds}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('PDF download error:', err);
        alert('PDF generation failed: ' + err.message);
      })
      .finally(() => { this.loadingPdf[offsetEntryId] = false; });
  }
}