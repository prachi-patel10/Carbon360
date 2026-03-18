import { Component, OnInit, signal } from '@angular/core';
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

  emissions = signal<GeneratorOperationDisplay[]>([]);
  filteredData = signal<GeneratorOperationDisplay[]>([]);

  fuelTypes: any[] = [];
  selectedFuelType: string = 'All';

  searchText = signal<string>('');

  //  Unified date range filter
  selectedDateRange: { startDate: Date | null; endDate: Date | null } = {
    startDate: null,
    endDate: null
  };

  selectedEntryDateRange: { startDate: Date | null; endDate: Date | null } = { startDate: null, endDate: null };

  //  Pagination state
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

  onFuelTypeChange(event: any) {
    this.selectedFuelType = event.target.value;
    this.applyFilters();
  }

  onDateRangeChange(event: any) {
    const value = event.target.value;
    if (!value) {
      this.selectedDateRange = { startDate: null, endDate: null };
      this.applyFilters();
      return;
    }

    const [from, to] = value.split(' to ');
    if (from && to) {
      const startDate = new Date(from);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);

      this.selectedDateRange = { startDate, endDate };

      console.log("▶ Start Date sent:", startDate.toISOString());
      console.log("▶ End Date sent:", endDate.toISOString());
    }

    this.applyFilters();
  }

  onSearch(event: any) {
    this.searchText.set(event.target.value);
    this.applyFilters();
  }

  applyFilters() {
    const sText = this.searchText().toLowerCase();
    const fFuel = this.selectedFuelType;

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
        fFuel === 'All' ||
        (e.fuelType || '').toLowerCase() === fFuel.toLowerCase();

      // Filter by Operation Date / Start-End time
      let matchesOperationDate = true;
      if (opStartRange && opEndRange) {
        const opStart = new Date(e.startTime);
        const opEnd = new Date(e.endTime);
        matchesOperationDate = opEnd >= opStartRange && opStart <= opEndRange;
      }

      // Filter by EntryDate range
      let matchesEntryDate = true;
      if (entryStartRange && entryEndRange) {
        const entryDate = new Date(e.entryDate);
        // Normalize times to ensure inclusive comparison
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
    this.currentPage.set(1); // reset to first page
  }

  /* ================= Pagination Helpers ================= */
  totalRecords() { return this.filteredData().length; }
  totalPages() { return Math.ceil(this.totalRecords() / this.pageSize()); }

  paginatedData() {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredData().slice(start, start + this.pageSize());
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  changePageSize(event: any) {
    this.pageSize.set(+event.target.value);
    this.currentPage.set(1);
  }

  goToDetail(operationId: string) {
    this.router.navigate(
      ['/dashboard/generator-ec', operationId],
      { queryParams: { mode: 'view', page: 'search' } }
    );
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    const sorted = [...this.filteredData()].sort((a: any, b: any) => {
      let valueA = a[column];
      let valueB = b[column];
      if (valueA == null) valueA = '';
      if (valueB == null) valueB = '';
      if (typeof valueA === 'string') valueA = valueA.toLowerCase();
      if (typeof valueB === 'string') valueB = valueB.toLowerCase();
      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredData.set(sorted);
  }


  // Called when user selects From Date
  onFromDateChange(event: any) {
    const value = event.target.value;
    if (value) {
      const startDate = new Date(value);
      startDate.setHours(0, 0, 0, 0); // always 00:00
      this.selectedDateRange.startDate = startDate;
      console.log("▶ From Date sent:", startDate.toISOString());
    } else {
      this.selectedDateRange.startDate = null;
    }
    this.applyFilters();
  }

  onToDateChange(event: any) {
    const value = event.target.value;
    if (value) {
      const endDate = new Date(value);
      endDate.setHours(23, 59, 59, 999); // always 23:59
      this.selectedDateRange.endDate = endDate;
      console.log("▶ To Date sent:", endDate.toISOString());
    } else {
      this.selectedDateRange.endDate = null;
    }
    this.applyFilters();
  }

  onDateRangeSelected(range: { startDate: Date | null, endDate: Date | null }) {

    this.selectedDateRange.startDate = range.startDate;
    this.selectedDateRange.endDate = range.endDate;

    this.applyFilters();
  }

  onEntryDateRangeSelected(range: { startDate: Date | null, endDate: Date | null }) {
    this.selectedEntryDateRange = range;
    console.log("▶ Entry Start Date:", range.startDate?.toISOString());
    console.log("▶ Entry End Date:", range.endDate?.toISOString());
    this.applyFilters();
  }
}
