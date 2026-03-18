import { Injectable } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

@Injectable({
  providedIn: 'root',
})
export class ChartService {

  // Bar chart config
  getBarChartConfig(): ChartConfiguration<'bar'> {
    return {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{
          label: 'Sales',
          data: [12, 19, 3, 5, 2],
          backgroundColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } }
      }
    };
  }

  // Line chart config
  getLineChartConfig(): ChartConfiguration<'line'> {
    return {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        datasets: [{
          label: 'Visitors',
          data: [50, 60, 70, 80, 90],
          borderColor: '#10b981',
          fill: false
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } }
      }
    };
  }

  // Pie chart config
  getPieChartConfig(): ChartConfiguration<'pie'> {
    return {
      type: 'pie',
      data: {
        labels: ['Chrome', 'Firefox', 'Edge'],
        datasets: [{
          label: 'Browser Share',
          data: [55, 25, 20],
          backgroundColor: ['#f87171', '#fbbf24', '#34d399']
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } }
      }
    };
  }
}
