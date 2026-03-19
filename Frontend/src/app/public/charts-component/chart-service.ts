import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

export interface DynamicBarData {
  labels: string[];
  data:   number[];
  label:  string;
  color:  string;
  title:  string;
}

@Injectable({
  providedIn: 'root',
})
export class ChartService {

  constructor(private http: HttpClient) {}

   // ── existing static configs (unchanged) ─────────────────────
  getBarChartConfig(): ChartConfiguration<'bar'> {
    return {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{ label: 'Sales', data: [12, 19, 3, 5, 2],
                    backgroundColor: '#3b82f6' }]
      },
      options: { responsive: true,
                 plugins: { legend: { display: true } } }
    };
  }

  getLineChartConfig(): ChartConfiguration<'line'> {
    return {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        datasets: [{ label: 'Visitors', data: [50, 60, 70, 80, 90],
                    borderColor: '#10b981', fill: false }]
      },
      options: { responsive: true,
                 plugins: { legend: { display: true } } }
    };
  }

  getPieChartConfig(): ChartConfiguration<'pie'> {
    return {
      type: 'pie',
      data: {
        labels: ['Chrome', 'Firefox', 'Edge'],
        datasets: [{ label: 'Browser Share', data: [55, 25, 20],
                    backgroundColor: ['#f87171', '#fbbf24', '#34d399'] }]
      },
      options: { responsive: true,
                 plugins: { legend: { position: 'bottom' } } }
    };
  }

  // ── new: dataset registry for dynamic bar chart ──────────────
  private dynamicDatasets: Record<string, DynamicBarData> = {

    fuelPerVehicle: {
      title:  'Fuel Consumed per Vehicle (Litres)',
      label:  'Fuel (Litres)',
      color:  '#3b82f6',
      labels: ['GJ-01-AA-1234', 'GJ-01-BB-5678', 'GJ-05-CC-9012',
               'GJ-07-DD-3456', 'GJ-09-EE-7890', 'GJ-11-FF-2345'],
      data:   [520, 340, 480, 210, 390, 275]
    },

    co2PerGenerator: {
      title:  'CO₂ Emission per Generator (kg)',
      label:  'CO₂e (kg)',
      color:  '#ef4444',
      labels: ['Gen-A (250kW)', 'Gen-B (500kW)', 'Gen-C (100kW)',
               'Gen-D (750kW)'],
      data:   [536, 1240, 198, 1875]
    },

    tripsPerCity: {
      title:  'Number of Trips per City',
      label:  'Trips',
      color:  '#8b5cf6',
      labels: ['Surat', 'Ahmedabad', 'Mumbai', 'Vadodara',
               'Rajkot', 'Gandhinagar'],
      data:   [145, 210, 98, 76, 54, 33]
    },

    runHoursPerGenerator: {
      title:  'Total Run Hours per Generator',
      label:  'Run Hours',
      color:  '#10b981',
      labels: ['Gen-A (250kW)', 'Gen-B (500kW)', 'Gen-C (100kW)',
               'Gen-D (750kW)'],
      data:   [120, 95, 210, 68]
    }
  };

  // ── returns Chart.js config for initial render ───────────────
  getDynamicBarConfig(key: string): ChartConfiguration<'bar'> {
    const d = this.getDynamicBarData(key);
    return {
      type: 'bar',
      data: {
        labels: d.labels,
        datasets: [{
          label:           d.label,
          data:            d.data,
          backgroundColor: d.color,
          borderRadius:    6,
          borderSkipped:   false
        }]
      },
      options: {
        responsive: true,
        animation: { duration: 600, easing: 'easeInOutQuart' },
        plugins: {
          legend: { display: true, position: 'top' },
          title:  { display: true, text: d.title, font: { size: 14 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true,
               grid: { color: 'rgba(0,0,0,0.05)' } }
        }
      }
    };
  }

  // ── returns only data (used for chart.update()) ──────────────
  getDynamicBarData(key: string): DynamicBarData {
    return this.dynamicDatasets[key] ?? this.dynamicDatasets['fuelPerVehicle'];
  }
}
