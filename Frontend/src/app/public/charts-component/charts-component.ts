import { Component, OnDestroy, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { ChartService } from './chart-service';
import { FormsModule } from '@angular/forms';


// Register all chart.js controllers, elements, scales
Chart.register(...registerables);

@Component({
  selector: 'app-charts-component',
  imports: [FormsModule],
  templateUrl: './charts-component.html',
  styleUrls: ['./charts-component.css'],
})
export class ChartsComponent implements OnInit, OnDestroy {
  // ── existing static charts ──────────────────────────────────
  private barChart!: Chart;
  private lineChart!: Chart;
  private pieChart!: Chart;

  // ── new dynamic bar chart ───────────────────────────────────
  private dynamicBarChart!: Chart;
  selectedDataset: string = 'fuelPerVehicle';

  constructor(private chartService: ChartService) {}

  ngOnInit(): void {
    this.createCharts();
    this.createDynamicBarChart();
  }

  // ── existing static chart creation (unchanged) ──────────────
  createCharts() {
    this.barChart  = new Chart('barChart',  this.chartService.getBarChartConfig());
    this.lineChart = new Chart('lineChart', this.chartService.getLineChartConfig());
    this.pieChart  = new Chart('pieChart',  this.chartService.getPieChartConfig());
  }

  // ── create the dynamic bar chart on first load ──────────────
  createDynamicBarChart() {
    const config = this.chartService.getDynamicBarConfig(this.selectedDataset);
    this.dynamicBarChart = new Chart('dynamicBarChart', config);
  }

  // ── called when user changes the dropdown ───────────────────
  onDatasetChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedDataset = select.value;

    const newData = this.chartService.getDynamicBarData(this.selectedDataset);

    // Update labels and dataset values without destroying the chart
    this.dynamicBarChart.data.labels = newData.labels;
    this.dynamicBarChart.data.datasets[0].data            = newData.data;
    this.dynamicBarChart.data.datasets[0].label           = newData.label;
    this.dynamicBarChart.data.datasets[0].backgroundColor = newData.color;
    this.dynamicBarChart.options!.plugins!.title!.text    = newData.title;

    this.dynamicBarChart.update();
  }

  // ── destroy all charts on component destroy ─────────────────
  ngOnDestroy(): void {
    this.barChart?.destroy();
    this.lineChart?.destroy();
    this.pieChart?.destroy();
    this.dynamicBarChart?.destroy();
  }
}
