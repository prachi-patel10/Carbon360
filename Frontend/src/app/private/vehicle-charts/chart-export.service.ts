import { Injectable } from '@angular/core';
// import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class ChartExportService {

  async exportChartWithData(
  elementId: string,
  fileName: string,
  labels: string[],
  datasets: { label: string, data: number[] }[]
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(fileName);

  // =========================
  // ✅ TABLE ONLY
  // =========================

  // Header
  const header = ['Month', ...datasets.map(d => d.label)];
  worksheet.addRow(header);

  // Rows
  labels.forEach((label, i) => {
    const row: (string | number)[] = [label];
    datasets.forEach(ds => {
      row.push(ds.data[i] || 0);
    });
    worksheet.addRow(row);
  });

  // Styling
  worksheet.getRow(1).font = { bold: true };

  // =========================
  // 💾 Download
  // =========================
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${fileName}.xlsx`);
}
}