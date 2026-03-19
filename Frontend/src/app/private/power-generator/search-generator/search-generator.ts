import { Component, OnInit, signal, ViewChild, HostListener } from '@angular/core';
import { GeneratorOperation, SearchGeneratorService } from './search-generator-service';
import { FueltypeService } from '../../masters/fueltype/fueltype-service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateRangePickerComponent } from '../../../public/date-range-picker-component/date-range-picker-component';

interface GeneratorOperationDisplay extends GeneratorOperation {
  status: string;
  totalEmission: number;
  fuelType: string;
}

@Component({
  selector: 'app-search-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, DateRangePickerComponent],
  templateUrl: './search-generator.html',
  styleUrls: ['./search-generator.css']
})
export class SearchGenerator implements OnInit {

  @ViewChild('opDatePicker') opDatePicker!: DateRangePickerComponent;
  @ViewChild('entryDatePicker') entryDatePicker!: DateRangePickerComponent;

  emissions = signal<GeneratorOperationDisplay[]>([]);
  filteredData = signal<GeneratorOperationDisplay[]>([]);

  fuelTypes: any[] = [];
  selectedFuels: string[] = [];
  fuelDropdownOpen = false;

  searchText = signal<string>('');

  selectedDateRange: { startDate: Date | null; endDate: Date | null } = {
    startDate: null,
    endDate: null
  };

  selectedEntryDateRange: { startDate: Date | null; endDate: Date | null } = {
    startDate: null,
    endDate: null
  };

  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private service: SearchGeneratorService,
    private fuelService: FueltypeService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.loadEmissions();
    this.loadFuelTypes();
  }

  // ─── Data Loading ────────────────────────────────────────────

  loadEmissions() {
    this.service.getEmissions().subscribe({
      next: (data: any[]) => {
        const mapped: GeneratorOperationDisplay[] = data.map((e: any) => ({
          ...e,
          generatorName: e.generatorName ?? 'Unknown Generator',
          fuelType: e.fuelType ?? 'Unknown',
          status: e.statusName ?? (e.statusId === 1 ? 'Completed' : 'Pending'),
          totalEmission: e.totalEmission ?? 0
        }));

        const sorted = mapped.sort((a, b) =>
          new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
        );
        this.emissions.set(sorted);
        this.filteredData.set(sorted);
      },
      error: (err) => console.error('Error loading emissions', err)
    });
  }

  loadFuelTypes() {
    this.fuelService.getAll().subscribe({
      next: (res: any) => {
        this.fuelTypes = Array.isArray(res) ? res : res.data || [];
      },
      error: (err) => console.error('Error loading fuel types', err)
    });
  }

  // ─── Fuel Multi-Select ───────────────────────────────────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.fuel-multiselect'))
      this.fuelDropdownOpen = false;
  }

  toggleFuelDropdown() {
    this.fuelDropdownOpen = !this.fuelDropdownOpen;
  }

  toggleFuel(name: string) {
    const idx = this.selectedFuels.indexOf(name);
    if (idx > -1) this.selectedFuels.splice(idx, 1);
    else this.selectedFuels.push(name);
    this.applyFilters();
  }

  isFuelSelected(name: string): boolean {
    return this.selectedFuels.includes(name);
  }

  toggleSelectAll() {
    if (this.selectedFuels.length === this.fuelTypes.length)
      this.selectedFuels = [];
    else
      this.selectedFuels = this.fuelTypes.map((f: any) => f.fuel_name);
    this.applyFilters();
  }

  clearFuels() {
    this.selectedFuels = [];
    this.applyFilters();
  }

  // ─── Search ──────────────────────────────────────────────────

  onSearch(event: any) {
    this.searchText.set(event.target.value);
    this.applyFilters();
  }

  // ─── Date Range ──────────────────────────────────────────────

  onDateRangeSelected(range: { startDate: Date | null; endDate: Date | null }) {
    this.selectedDateRange = range;
    this.applyFilters();
  }

  onEntryDateRangeSelected(range: { startDate: Date | null; endDate: Date | null }) {
    this.selectedEntryDateRange = range;
    this.applyFilters();
  }

  // ─── Reset ───────────────────────────────────────────────────

  resetFilters() {
    this.selectedFuels = [];
    this.fuelDropdownOpen = false;
    this.searchText.set('');
    this.selectedDateRange = { startDate: null, endDate: null };
    this.selectedEntryDateRange = { startDate: null, endDate: null };
    this.currentPage.set(1);
    this.filteredData.set(this.emissions());
    this.opDatePicker?.reset();
    this.entryDatePicker?.reset();
  }

  // ─── Filters ─────────────────────────────────────────────────

  applyFilters() {
    const sText = this.searchText().toLowerCase();
    const opStartRange = this.selectedDateRange.startDate;
    const opEndRange = this.selectedDateRange.endDate;
    const entryStartRange = this.selectedEntryDateRange.startDate;
    const entryEndRange = this.selectedEntryDateRange.endDate;

    const filtered = this.emissions().filter(e => {
      const matchesSearch =
        (e.operationId || '').toString().toLowerCase().includes(sText) ||
        (e.generatorName || '').toLowerCase().includes(sText) ||
        (e.fuelType || '').toLowerCase().includes(sText);

      const matchesFuel =
        this.selectedFuels.length === 0 ||
        this.selectedFuels.map(f => f.toLowerCase())
          .includes((e.fuelType || '').toLowerCase());

      let matchesOperationDate = true;
      if (opStartRange && opEndRange) {
        const opStart = new Date(e.startTime);
        const opEnd = new Date(e.endTime);
        matchesOperationDate = opEnd >= opStartRange && opStart <= opEndRange;
      }

      let matchesEntryDate = true;
      if (entryStartRange && entryEndRange) {
        const entryDate = new Date(e.entryDate);
        entryDate.setHours(0, 0, 0, 0);
        const start = new Date(entryStartRange);
        start.setHours(0, 0, 0, 0);
        const end = new Date(entryEndRange);
        end.setHours(23, 59, 59, 999);
        matchesEntryDate = entryDate >= start && entryDate <= end;
      }

      return matchesSearch && matchesFuel && matchesOperationDate && matchesEntryDate;
    });

    this.filteredData.set(filtered);
    this.currentPage.set(1);
  }

  // ─── Pagination ──────────────────────────────────────────────

  totalRecords() { return this.filteredData().length; }
  totalPages() { return Math.ceil(this.totalRecords() / this.pageSize()); }

  paginatedData() {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredData().slice(start, start + this.pageSize());
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages())
      this.currentPage.set(page);
  }

  changePageSize(event: any) {
    this.pageSize.set(+event.target.value);
    this.currentPage.set(1);
  }

  // ─── Navigation ──────────────────────────────────────────────

  goToDetail(operationId: string) {
    this.router.navigate(
      ['/dashboard/generator-ec', operationId],
      { queryParams: { mode: 'view', page: 'search' } }
    );
  }

  // ─── Sort ────────────────────────────────────────────────────

  sortBy(column: string) {
    if (this.sortColumn === column)
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    const sorted = [...this.filteredData()].sort((a: any, b: any) => {
      let valueA = a[column] ?? '';
      let valueB = b[column] ?? '';
      if (typeof valueA === 'string') valueA = valueA.toLowerCase();
      if (typeof valueB === 'string') valueB = valueB.toLowerCase();
      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredData.set(sorted);
  }
  getSortIcon(column: string): string {
  if (this.sortColumn !== column) return '↕';
  return this.sortDirection === 'asc' ? '↑' : '↓';
}
}