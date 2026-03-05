import { Component, OnInit, signal } from '@angular/core';
import { GeneratorOperation, SearchGeneratorService } from './search-generator-service';
import { FueltypeService } from '../../masters/fueltype/fueltype-service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface GeneratorOperationDisplay extends GeneratorOperation {
  status: string;
  totalEmission: number;
  fuelType: string;
}

interface EmissionModal {
  runHours?: number;
  loadFactor?: number;
  powerOutputKWH?: number;
  fuelConsumedLiters?: number;
  cO2?: number;
  nO2?: number;
  cH4?: number;
  gwP_CH4?: number;
  gwP_NO2?: number;
  totalEmission?: number;
}

@Component({
  selector: 'app-search-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-generator.html',
  styleUrls: ['./search-generator.css']
})
export class SearchGenerator implements OnInit {

  emissions = signal<GeneratorOperationDisplay[]>([]);
  filteredData = signal<GeneratorOperationDisplay[]>([]);
  fuelTypes: any[] = [];
  selectedFuelType: string = 'All';
  searchText = signal<string>('');
  filterStartTime = signal<string | null>(null);
  filterEndTime = signal<string | null>(null);

  calculatedResult: EmissionModal | null = null;

  constructor(
    private service: SearchGeneratorService,
    private fuelService: FueltypeService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadEmissions();
    this.loadFuelTypes();
  }

  loadEmissions() {
    this.service.getEmissions().subscribe((data: GeneratorOperation[]) => {
      const mapped: GeneratorOperationDisplay[] = data.map(e => ({
        ...e,
        status: e.statusName ?? (e.statusId === 1 ? 'Completed' : 'Pending'),
        totalEmission: e.total_co2e_kg ?? 0,
        fuelType: (e as any).fuelType ?? 'Unknown',
        generatorName: e.generatorName ?? 'Unknown Generator'
      }));

      this.emissions.set(mapped);
      this.filteredData.set(mapped);
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

  onStartTimeChange(event: any) {
    this.filterStartTime.set(event.target.value || null);
    this.applyFilters();
  }

  onEndTimeChange(event: any) {
    this.filterEndTime.set(event.target.value || null);
    this.applyFilters();
  }

  onSearch(event: any) {
    this.searchText.set(event.target.value);
    this.applyFilters();
  }

  applyFilters() {
    const sText = this.searchText().toLowerCase();
    const fFuel = this.selectedFuelType;
    const startTime = this.filterStartTime();
    const endTime = this.filterEndTime();

    const filtered = this.emissions().filter(e => {
      const matchesSearch =
        (e.operationId ?? '').toLowerCase().includes(sText) ||
        (e.generatorName ?? '').toLowerCase().includes(sText);

      const matchesFuel = fFuel === 'All' || e.fuelType === fFuel;

      let matchesDate = true;
      const opDate = new Date(e.operationDate);
      if (startTime) matchesDate = matchesDate && opDate >= new Date(startTime);
      if (endTime) matchesDate = matchesDate && opDate <= new Date(endTime);

      return matchesSearch && matchesFuel && matchesDate;
    });

    this.filteredData.set(filtered);
  }

  filteredEmissions() {
    return this.filteredData();
  }

  openOperation(operationId: string) {
    const selected = this.emissions().find(e => e.operationId === operationId);
    if (!selected) return;

    const gwP_CH4 = 25;
    const gwP_NO2 = 298;

    this.calculatedResult = {
      runHours: selected.runHours,
      loadFactor: selected.loadFactor,
      powerOutputKWH: selected.powerOutputKWH,
      fuelConsumedLiters: selected.fuelConsumedLiters,
      cO2: selected.co2_kg ?? 0,
      nO2: selected.no2_kg ?? 0,
      cH4: selected.ch4_kg ?? 0,
      gwP_CH4,
      gwP_NO2,
      totalEmission: (selected.co2_kg ?? 0) + (selected.ch4_kg ?? 0) * gwP_CH4 + (selected.no2_kg ?? 0) * gwP_NO2
    };
  }

  closeModal() {
    this.calculatedResult = null;
  }

}