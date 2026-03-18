import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { ChartService } from './chart-service';


// Register all chart.js controllers, elements, scales
Chart.register(...registerables);

@Component({
  selector: 'app-charts-component',
  templateUrl: './charts-component.html',
  styleUrls: ['./charts-component.css'],
})
export class ChartsComponent implements OnInit {
  constructor(private chartService: ChartService) {}

  ngOnInit(): void {
    this.createCharts();
  }

  createCharts() {
    new Chart('barChart', this.chartService.getBarChartConfig());
    new Chart('lineChart', this.chartService.getLineChartConfig());
    new Chart('pieChart', this.chartService.getPieChartConfig());
  }
}
