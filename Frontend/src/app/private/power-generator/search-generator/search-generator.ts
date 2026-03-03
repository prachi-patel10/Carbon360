import { Component, OnInit, signal } from '@angular/core';
import { GeneratorOperation, SearchGeneratorService } from './search-generator-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Extended interface to include computed/display fields
interface GeneratorOperationDisplay extends GeneratorOperation {
  status: string;
  totalEmission: number;
  fuelType: string;
}

@Component({
  selector: 'app-search-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-generator.html',
  styleUrls: ['./search-generator.css'],
})
export class SearchGenerator implements OnInit {
  // Signals
  emissions = signal<GeneratorOperationDisplay[]>([]);
  filteredData = signal<GeneratorOperationDisplay[]>([]);
  searchText = signal<string>('');
  filterStatus = signal<string>('All');
  filterFuel = signal<string>('All');
  filterStartTime = signal<string | null>(null);
  filterEndTime = signal<string | null>(null);

  constructor(private service: SearchGeneratorService) {}

  ngOnInit(): void {
    this.loadEmissions();
  }

  // Load emissions from API and map to display fields
  loadEmissions() {
    this.service.getEmissions().subscribe((data: GeneratorOperation[]) => {
      const mapped: GeneratorOperationDisplay[] = data.map(e => ({
        ...e,
        status: e.statusName ?? (e.statusId === 1 ? 'Completed' : 'Pending'),
        totalEmission: e.total_co2e_kg ?? 0,          // ✅ Use API field
        fuelType: (e as any).fuelType ?? 'Unknown',  // Replace with actual API field if available
        generatorName: e.generatorName ?? `Generator ${e.generatorId}`,
      }));

      this.emissions.set(mapped);
      this.filteredData.set(mapped);
    });
  }

  // Quick search by ID or Generator Name
  onSearch(event: any) {
    this.searchText.set(event.target.value);
    this.applyFilters();
  }

  // Fuel filter change
  onFuelTypeChange(event: any) {
    this.filterFuel.set(event.target.value);
    this.applyFilters();
  }

  // Start time filter change
  onStartTimeChange(event: any) {
    this.filterStartTime.set(event.target.value || null);
  }

  // End time filter change
  onEndTimeChange(event: any) {
    this.filterEndTime.set(event.target.value || null);
  }

  // Apply filters for table
  applyFilters() {
    const sText = this.searchText().toLowerCase();
    const fStatus = this.filterStatus();
    const fFuel = this.filterFuel();
    const startTime = this.filterStartTime();
    const endTime = this.filterEndTime();

    const filtered = this.emissions().filter((e: GeneratorOperationDisplay) => {
      const matchesSearch =
        e.operationId.toString().includes(sText) ||
        e.generatorName.toLowerCase().includes(sText);

      const matchesStatus = fStatus === 'All' || e.status === fStatus;
      const matchesFuel = fFuel === 'All' || e.fuelType === fFuel;

      let matchesDate = true;
      const opDate = new Date(e.operationDate);
      if (startTime) matchesDate = matchesDate && opDate >= new Date(startTime);
      if (endTime) matchesDate = matchesDate && opDate <= new Date(endTime);

      return matchesSearch && matchesStatus && matchesFuel && matchesDate;
    });

    this.filteredData.set(filtered);
  }

  // Getter for table
  filteredEmissions() {
    return this.filteredData();
  }
}