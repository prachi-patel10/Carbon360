using ClosedXML.Excel;
using NPOI.OpenXmlFormats.Dml;
//using DocumentFormat.OpenXml.Drawing.Charts;
using NPOI.OpenXmlFormats.Dml.Chart;
using NPOI.OpenXmlFormats.Dml.Chart;
using NPOI.SS.UserModel;
using NPOI.SS.UserModel;
using NPOI.SS.UserModel.Charts;
using NPOI.SS.Util;
using NPOI.SS.Util;
using NPOI.XSSF.UserModel;
using NPOI.XSSF.UserModel;
using NPOI.XSSF.UserModel.Charts;
using ProjectApp.Core.DTOs.Charts;
using System.Reflection;
using System.Text;
using System.Text;
using DmlColor = NPOI.OpenXmlFormats.Dml.CT_SRgbColor;
// ✅ Aliases to avoid namespace conflicts
using DmlFill = NPOI.OpenXmlFormats.Dml.CT_SolidColorFillProperties;
using DmlLine = NPOI.OpenXmlFormats.Dml.CT_LineProperties;


namespace ProjectApp.Repository.Services.Common
{
    public static class ExcelExportHelper
    {
        public static async Task<byte[]> ExportToExcelAsync<T>(
            IEnumerable<T> data,
            Dictionary<string, string> columnMappings,
            string sheetName = "Sheet1",
            string title = "Report")
        {
            if (data == null || !data.Any())
                return Array.Empty<byte>();

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add(sheetName);

            // ✅ TITLE
            worksheet.Range(1, 1, 1, columnMappings.Count).Merge();
            worksheet.Cell(1, 1).Value = title;
            worksheet.Cell(1, 1).Style.Font.Bold = true;
            worksheet.Cell(1, 1).Style.Font.FontSize = 16;
            worksheet.Cell(1, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

            // ✅ HEADERS
            int col = 1;
            foreach (var header in columnMappings.Keys)
            {
                var cell = worksheet.Cell(3, col);
                cell.Value = header;
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.LightGray;
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                col++;
            }

            // ✅ DATA
            int row = 4;

            foreach (var item in data)
            {
                col = 1;

                foreach (var mapping in columnMappings.Values)
                {
                    var prop = typeof(T).GetProperty(mapping,
                        BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

                    var cell = worksheet.Cell(row, col);

                    if (prop != null)
                    {
                        var value = prop.GetValue(item);

                        if (value == null)
                            cell.Value = "";
                        else if (value is DateTime dt)
                        {
                            if (dt == DateTime.MinValue)
                                cell.Value = "";
                            else
                            {
                                cell.Value = dt;
                                cell.Style.DateFormat.Format = "dd-MMM-yyyy";
                            }
                        }
                        else if (value is decimal || value is double || value is float)
                            cell.Value = Convert.ToDouble(value);
                        else if (value is int || value is long)
                            cell.Value = Convert.ToInt64(value);
                        else
                            cell.Value = value.ToString();
                    }

                    col++;
                }

                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        //    public static async Task<byte[]> ExportExcelWithChartAsync<T>(
        //IEnumerable<T> data,
        //Dictionary<string, string> columnMappings,
        //string sheetName = "Sheet1",
        //string chartTitle = "Report Chart")
        //    {
        //        if (!data.Any())
        //            return Array.Empty<byte>();

        //        var workbook = new XSSFWorkbook();
        //        var sheet = workbook.CreateSheet(sheetName);

        //        // 1️⃣ Headers
        //        var headerRow = sheet.CreateRow(0);
        //        int col = 0;
        //        foreach (var header in columnMappings.Keys)
        //            headerRow.CreateCell(col++).SetCellValue(header);

        //        // 2️⃣ Data
        //        int rowIdx = 1;
        //        foreach (var item in data)
        //        {
        //            var row = sheet.CreateRow(rowIdx++);
        //            col = 0;

        //            foreach (var propName in columnMappings.Values)
        //            {
        //                var prop = typeof(T).GetProperty(propName);
        //                var val = prop?.GetValue(item);

        //                var cell = row.CreateCell(col++);

        //                if (val is double d)
        //                    cell.SetCellValue(d);
        //                else if (val is int i)
        //                    cell.SetCellValue(i);
        //                else if (val is decimal dec)
        //                    cell.SetCellValue((double)dec);
        //                else
        //                    cell.SetCellValue(val?.ToString());
        //            }
        //        }

        //        // 3️⃣ Chart
        //        var drawing = sheet.CreateDrawingPatriarch();
        //        var anchor = drawing.CreateAnchor(0, 0, 0, 0, col + 1, 1, col + 10, 20);
        //        var chart = (XSSFChart)drawing.CreateChart(anchor);

        //        chart.SetTitle(chartTitle);
        //        var legend = chart.GetOrCreateLegend();
        //        legend.Position = LegendPosition.Bottom;

        //        var bottomAxis = chart.CreateCategoryAxis(AxisPosition.Bottom);
        //        var leftAxis = chart.CreateValueAxis(AxisPosition.Left);

        //        leftAxis.Minimum = 0;

        //        // ⭐ dynamic max calculation
        //        var maxValue = data
        //            .SelectMany(x => typeof(T).GetProperties()
        //                .Where(p => p.PropertyType == typeof(double)
        //                         || p.PropertyType == typeof(int)
        //                         || p.PropertyType == typeof(decimal))
        //                .Select(p => Convert.ToDouble(p.GetValue(x) ?? 0)))
        //            .Max();

        //        leftAxis.Maximum = maxValue + (maxValue * 0.2); // 20% extra space

        //        var dataFactory = chart.ChartDataFactory;
        //        var chartData = dataFactory.CreateBarChartData<string, double>();

        //        var rowCount = data.Count();
        //        var xAxisRange = new CellRangeAddress(1, rowCount, 0, 0); // first column as X

        //        int seriesCol = 1;
        //        foreach (var header in columnMappings.Keys.Skip(1)) // skip X-axis
        //        {
        //            var yRange = new CellRangeAddress(1, rowCount, seriesCol, seriesCol);
        //            chartData.AddSeries(DataSources.FromStringCellRange(sheet, xAxisRange),
        //                                DataSources.FromNumericCellRange(sheet, yRange))
        //                     .SetTitle(header);
        //            seriesCol++;
        //        }

        //        chart.Plot(chartData, bottomAxis, leftAxis);

        //        // 4️⃣ Optional: fix column style for BarChart
        //        var ctChart = chart.GetCTChart();
        //        if (ctChart.plotArea.barChart != null && ctChart.plotArea.barChart.Count > 0)
        //        {
        //            var barChart = ctChart.plotArea.barChart[0];
        //            barChart.barDir = new NPOI.OpenXmlFormats.Dml.Chart.CT_BarDir { val = NPOI.OpenXmlFormats.Dml.Chart.ST_BarDir.col };
        //            barChart.grouping = new NPOI.OpenXmlFormats.Dml.Chart.CT_BarGrouping { val = NPOI.OpenXmlFormats.Dml.Chart.ST_BarGrouping.clustered };
        //        }

        //        // Auto-size columns
        //        for (int i = 0; i < columnMappings.Count; i++)
        //            sheet.AutoSizeColumn(i);

        //        using var stream = new MemoryStream();
        //        workbook.Write(stream);
        //        return stream.ToArray();
        //    }

        public static async Task<byte[]> ExportExcelWithChartAsync<T>(
    IEnumerable<T> data,
    Dictionary<string, string> columnMappings,
    string sheetName = "Sheet1",
    string chartTitle = "Report Chart")
        {
            if (!data.Any())
                return Array.Empty<byte>();

            var dataList = data.ToList();
            var workbook = new XSSFWorkbook();
            var sheet = workbook.CreateSheet(sheetName);

            // 1️⃣ HEADERS
            var headerRow = sheet.CreateRow(0);
            int col = 0;
            foreach (var header in columnMappings.Keys)
                headerRow.CreateCell(col++).SetCellValue(header);

            // 2️⃣ DATA
            int rowIdx = 1;
            foreach (var item in dataList)
            {
                var row = sheet.CreateRow(rowIdx++);
                col = 0;
                foreach (var propName in columnMappings.Values)
                {
                    var prop = typeof(T).GetProperty(propName);
                    var val = prop?.GetValue(item);
                    var cell = row.CreateCell(col++);

                    if (val is double d) cell.SetCellValue(d);
                    else if (val is int i) cell.SetCellValue(i);
                    else if (val is decimal dec) cell.SetCellValue((double)dec);
                    else cell.SetCellValue(val?.ToString());
                }
            }

            // 3️⃣ CHART SETUP
            var drawing = sheet.CreateDrawingPatriarch();
            var anchor = drawing.CreateAnchor(0, 0, 0, 0, col + 1, 1, col + 12, 22);
            var chart = (XSSFChart)drawing.CreateChart(anchor);

            chart.SetTitle(chartTitle);
            chart.GetOrCreateLegend().Position = LegendPosition.Bottom;

            var bottomAxis = chart.CreateCategoryAxis(AxisPosition.Bottom);
            var leftAxis = chart.CreateValueAxis(AxisPosition.Left);

            // ✅ MAX VALUE CALCULATE
            var numericProps = columnMappings.Values.Skip(1).ToList();
            var allValues = dataList
                .SelectMany(x => numericProps.Select(p =>
                {
                    var prop = typeof(T).GetProperty(p);
                    return Convert.ToDouble(prop?.GetValue(x) ?? 0);
                }))
                .Where(v => v > 0)
                .DefaultIfEmpty(0)
                .ToList();

            double maxValue = allValues.Max();

            var dataFactory = chart.ChartDataFactory;
            var chartData = dataFactory.CreateBarChartData<string, double>();

            int rowCount = dataList.Count;

            // ✅ KEY FIX: X-axis range row 1 se rowCount tak
            var xAxisRange = new CellRangeAddress(1, rowCount, 0, 0);

            // ✅ KEY FIX: Sirf wo series add karo jinka data > 0 ho
            // seriesCol = Excel sheet column index (always increment)
            int seriesCol = 1;
            foreach (var header in columnMappings.Keys.Skip(1))
            {
                var propName = columnMappings[header];

                bool hasAnyData = dataList.Any(x =>
                {
                    var prop = typeof(T).GetProperty(propName);
                    return Convert.ToDouble(prop?.GetValue(x) ?? 0) > 0;
                });

                if (hasAnyData)
                {
                    // ✅ seriesCol = actual Excel column index
                    var yRange = new CellRangeAddress(1, rowCount, seriesCol, seriesCol);
                    chartData.AddSeries(
                        DataSources.FromStringCellRange(sheet, xAxisRange),
                        DataSources.FromNumericCellRange(sheet, yRange)
                    ).SetTitle(header);
                }

                seriesCol++; // ✅ Hamesha increment - Excel column track karna zaroori hai
            }

            chart.Plot(chartData, bottomAxis, leftAxis);

            // ✅ Y-AXIS SCALE FIX
            var ctChart = chart.GetCTChart();

            double minAxis = 0;
            double axisMax = Math.Ceiling(maxValue / 500) * 500;

            foreach (var valAx in ctChart.plotArea.valAx)
            {
                valAx.scaling = new NPOI.OpenXmlFormats.Dml.Chart.CT_Scaling
                {
                    orientation = new NPOI.OpenXmlFormats.Dml.Chart.CT_Orientation
                    {
                        val = NPOI.OpenXmlFormats.Dml.Chart.ST_Orientation.minMax
                    },
                    min = new NPOI.OpenXmlFormats.Dml.Chart.CT_Double { val = minAxis },
                    max = new NPOI.OpenXmlFormats.Dml.Chart.CT_Double { val = axisMax }
                };

                valAx.crossesAt = null;
                valAx.crosses = new NPOI.OpenXmlFormats.Dml.Chart.CT_Crosses
                {
                    val = NPOI.OpenXmlFormats.Dml.Chart.ST_Crosses.autoZero
                };
            }

            // ✅ CLUSTERED BAR + GAP WIDTH
            if (ctChart.plotArea.barChart != null && ctChart.plotArea.barChart.Count > 0)
            {
                var barChart = ctChart.plotArea.barChart[0];

                barChart.barDir = new NPOI.OpenXmlFormats.Dml.Chart.CT_BarDir
                {
                    val = NPOI.OpenXmlFormats.Dml.Chart.ST_BarDir.col
                };

                barChart.grouping = new NPOI.OpenXmlFormats.Dml.Chart.CT_BarGrouping
                {
                    val = NPOI.OpenXmlFormats.Dml.Chart.ST_BarGrouping.clustered
                };

                // ✅ Wider bars = small values (Jan 400) clearly visible honge
                barChart.gapWidth = new NPOI.OpenXmlFormats.Dml.Chart.CT_GapAmount
                {
                    val = 50  // ✅ 50 = bahut wide bars, 400 clearly dikhega
                };
            }

            // 4️⃣ AUTO SIZE COLUMNS
            for (int i = 0; i < columnMappings.Count; i++)
                sheet.AutoSizeColumn(i);

            using var stream = new MemoryStream();
            workbook.Write(stream);
            return stream.ToArray();
        }
        //    public static async Task<byte[]> ExportExcelWithChartAsync<T>(
        //IEnumerable<T> data,
        //Dictionary<string, string> columnMappings,
        //string sheetName = "Sheet1",
        //string chartTitle = "Report Chart")
        //    {
        //        if (!data.Any())
        //            return Array.Empty<byte>();

        //        var workbook = new XSSFWorkbook();
        //        var sheet = workbook.CreateSheet(sheetName);

        //        // 1️⃣ HEADERS
        //        var headerRow = sheet.CreateRow(0);
        //        int col = 0;
        //        foreach (var header in columnMappings.Keys)
        //            headerRow.CreateCell(col++).SetCellValue(header);

        //        // 2️⃣ DATA
        //        int rowIdx = 1;
        //        foreach (var item in data)
        //        {
        //            var row = sheet.CreateRow(rowIdx++);
        //            col = 0;

        //            foreach (var propName in columnMappings.Values)
        //            {
        //                var prop = typeof(T).GetProperty(propName);
        //                var val = prop?.GetValue(item);

        //                var cell = row.CreateCell(col++);

        //                if (val is double d)
        //                    cell.SetCellValue(d);
        //                else if (val is int i)
        //                    cell.SetCellValue(i);
        //                else if (val is decimal dec)
        //                    cell.SetCellValue((double)dec);
        //                else
        //                    cell.SetCellValue(val?.ToString());
        //            }
        //        }

        //        // 3️⃣ CHART
        //        var drawing = sheet.CreateDrawingPatriarch();
        //        var anchor = drawing.CreateAnchor(0, 0, 0, 0, col + 1, 1, col + 12, 22);
        //        var chart = (XSSFChart)drawing.CreateChart(anchor);

        //        chart.SetTitle(chartTitle);
        //        chart.GetOrCreateLegend().Position = LegendPosition.Bottom;

        //        var bottomAxis = chart.CreateCategoryAxis(AxisPosition.Bottom);
        //        var leftAxis = chart.CreateValueAxis(AxisPosition.Left);

        //        // ❌ REMOVE THIS (important)
        //        // leftAxis.Minimum = 0;

        //        // ✅ FIX 1: ONLY mapped numeric columns
        //        var numericProps = columnMappings.Values.Skip(1).ToList();

        //        var values = data
        //            .SelectMany(x => numericProps.Select(p =>
        //            {
        //                var prop = typeof(T).GetProperty(p);
        //                return Convert.ToDouble(prop?.GetValue(x) ?? 0);
        //            }))
        //            .Where(v => v > 0)
        //            .DefaultIfEmpty(0)
        //            .ToList();

        //        double maxValue = values.Max();

        //        var dataFactory = chart.ChartDataFactory;
        //        var chartData = dataFactory.CreateBarChartData<string, double>();

        //        int rowCount = data.Count();
        //        var xAxisRange = new CellRangeAddress(1, rowCount, 0, 0);

        //        int seriesCol = 1;
        //        foreach (var header in columnMappings.Keys.Skip(1))
        //        {
        //            var propName = columnMappings[header];

        //            // ✅ Pure zero columns chart se skip karo
        //            bool hasData = data.Any(x =>
        //            {
        //                var prop = typeof(T).GetProperty(propName);
        //                return Convert.ToDouble(prop?.GetValue(x) ?? 0) > 0;
        //            });

        //            if (hasData)  // ✅ Sirf non-zero series add karo
        //            {
        //                var yRange = new CellRangeAddress(1, rowCount, seriesCol, seriesCol);
        //                chartData.AddSeries(
        //                    DataSources.FromStringCellRange(sheet, xAxisRange),
        //                    DataSources.FromNumericCellRange(sheet, yRange)
        //                ).SetTitle(header);
        //            }

        //            seriesCol++;  // ✅ seriesCol badhta rahe (column position sahi rahe)
        //        }

        //        //int seriesCol = 1;
        //        //foreach (var header in columnMappings.Keys.Skip(1))
        //        //{
        //        //    var yRange = new CellRangeAddress(1, rowCount, seriesCol, seriesCol);

        //        //    chartData.AddSeries(
        //        //        DataSources.FromStringCellRange(sheet, xAxisRange),
        //        //        DataSources.FromNumericCellRange(sheet, yRange)
        //        //    ).SetTitle(header);

        //        //    seriesCol++;
        //        //}

        //        chart.Plot(chartData, bottomAxis, leftAxis);

        //        // ✅🔥 REAL FIX: FORCE Y-AXIS SCALE (NO AUTO BUG)
        //        var ctChart = chart.GetCTChart();

        //        double minAxis = 0;
        //        double axisMax = Math.Ceiling(maxValue / 500) * 500;

        //        foreach (var valAx in ctChart.plotArea.valAx)
        //        {
        //            valAx.scaling = new NPOI.OpenXmlFormats.Dml.Chart.CT_Scaling
        //            {
        //                orientation = new NPOI.OpenXmlFormats.Dml.Chart.CT_Orientation
        //                {
        //                    val = NPOI.OpenXmlFormats.Dml.Chart.ST_Orientation.minMax
        //                },
        //                min = new NPOI.OpenXmlFormats.Dml.Chart.CT_Double { val = minAxis },
        //                max = new NPOI.OpenXmlFormats.Dml.Chart.CT_Double { val = axisMax }
        //            };

        //            valAx.crossesAt = null;
        //            valAx.crosses = new NPOI.OpenXmlFormats.Dml.Chart.CT_Crosses
        //            {
        //                val = NPOI.OpenXmlFormats.Dml.Chart.ST_Crosses.autoZero
        //            };
        //        }

        //        // ✅ STACKED BAR FIX

        //        // ✅ GROUPED (CLUSTERED) BAR FIX - stacked ki jagah clustered karo
        //        if (ctChart.plotArea.barChart != null && ctChart.plotArea.barChart.Count > 0)
        //        {
        //            var barChart = ctChart.plotArea.barChart[0];

        //            barChart.barDir = new NPOI.OpenXmlFormats.Dml.Chart.CT_BarDir
        //            {
        //                val = NPOI.OpenXmlFormats.Dml.Chart.ST_BarDir.col
        //            };

        //            // ❌ PEHLE: stacked tha
        //            // barChart.grouping = new CT_BarGrouping { val = ST_BarGrouping.stacked };

        //            // ✅ AB: clustered karo
        //            barChart.grouping = new NPOI.OpenXmlFormats.Dml.Chart.CT_BarGrouping
        //            {
        //                val = NPOI.OpenXmlFormats.Dml.Chart.ST_BarGrouping.clustered
        //            };

        //            barChart.gapWidth = new NPOI.OpenXmlFormats.Dml.Chart.CT_GapAmount
        //            {
        //                val = 80  // Kam gap = wider bars
        //            };


        //            // ❌ overlap 100 hatao - sirf stacked ke liye tha
        //            // barChart.overlap = new CT_Overlap { val = 100 };
        //        }

        //        // 4️⃣ AUTO SIZE
        //        for (int i = 0; i < columnMappings.Count; i++)
        //            sheet.AutoSizeColumn(i);

        //        using var stream = new MemoryStream();
        //        workbook.Write(stream);
        //        return stream.ToArray();
        //    }

        public static async Task<byte[]> ExportExcelWithLineChartAsync<T>(
    IEnumerable<T> data,
    Dictionary<string, string> columnMappings,
    string sheetName = "Sheet1",
    string chartTitle = "Report Chart")
        {
            if (!data.Any())
                return Array.Empty<byte>();

            var workbook = new XSSFWorkbook();
            var sheet = workbook.CreateSheet(sheetName);

            // 1️⃣ HEADERS
            var headerRow = sheet.CreateRow(0);
            int col = 0;
            foreach (var header in columnMappings.Keys)
                headerRow.CreateCell(col++).SetCellValue(header);

            // 2️⃣ DATA
            int rowIdx = 1;
            foreach (var item in data)
            {
                var row = sheet.CreateRow(rowIdx++);
                col = 0;

                foreach (var propName in columnMappings.Values)
                {
                    var prop = typeof(T).GetProperty(
                        propName,
                        BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase
                    );

                    var val = prop?.GetValue(item);
                    var cell = row.CreateCell(col++);

                    if (val is double d)
                        cell.SetCellValue(d);
                    else if (val is int i)
                        cell.SetCellValue(i);
                    else if (val is decimal dec)
                        cell.SetCellValue((double)dec);
                    else
                        cell.SetCellValue(val?.ToString());
                }
            }

            // 3️⃣ CHART
            var drawing = sheet.CreateDrawingPatriarch();
            var anchor = drawing.CreateAnchor(0, 0, 0, 0, col + 1, 1, col + 14, 24);
            var chart = (XSSFChart)drawing.CreateChart(anchor);

            chart.SetTitle(chartTitle);
            chart.GetOrCreateLegend().Position = LegendPosition.Bottom;

            var bottomAxis = chart.CreateCategoryAxis(AxisPosition.Bottom);
            var leftAxis = chart.CreateValueAxis(AxisPosition.Left);

            var dataFactory = chart.ChartDataFactory;
            var chartData = dataFactory.CreateLineChartData<string, double>();

            int rowCount = data.Count();
            var xAxisRange = new CellRangeAddress(1, rowCount, 0, 0);

            int seriesCol = 1;
            foreach (var header in columnMappings.Keys.Skip(1))
            {
                var yRange = new CellRangeAddress(1, rowCount, seriesCol, seriesCol);

                chartData.AddSeries(
                    DataSources.FromStringCellRange(sheet, xAxisRange),
                    DataSources.FromNumericCellRange(sheet, yRange)
                ).SetTitle(header);

                seriesCol++;
            }

            // 🔥 IMPORTANT: Plot FIRST
            chart.Plot(chartData, bottomAxis, leftAxis);

            // 4️⃣ 🔥 FIX Y-AXIS (START FROM 500 LIKE UI)
            var ctChart = chart.GetCTChart();

            var numericValues = data
                .SelectMany(x => typeof(T).GetProperties()
                    .Where(p => p.PropertyType == typeof(double)
                             || p.PropertyType == typeof(int)
                             || p.PropertyType == typeof(decimal))
                    .Select(p => Convert.ToDouble(p.GetValue(x) ?? 0)))
                .Where(v => v > 0)
                .DefaultIfEmpty(100)
                .ToList();

            double maxValue = numericValues.Max();

            // ✅ UI-style scaling
            double minAxis = maxValue > 500 ? 500 : 0;
            double axisMax = Math.Ceiling(maxValue / 500) * 500;

            foreach (var valAx in ctChart.plotArea.valAx)
            {
                valAx.scaling = new NPOI.OpenXmlFormats.Dml.Chart.CT_Scaling
                {
                    orientation = new NPOI.OpenXmlFormats.Dml.Chart.CT_Orientation
                    {
                        val = NPOI.OpenXmlFormats.Dml.Chart.ST_Orientation.minMax
                    },
                    min = new NPOI.OpenXmlFormats.Dml.Chart.CT_Double { val = 0 },
                    //min = new NPOI.OpenXmlFormats.Dml.Chart.CT_Double { val = minAxis }, // ✅ 500
                    max = new NPOI.OpenXmlFormats.Dml.Chart.CT_Double { val = axisMax }
                };

                valAx.crossesAt = null;
                valAx.crosses = new NPOI.OpenXmlFormats.Dml.Chart.CT_Crosses
                {
                    val = NPOI.OpenXmlFormats.Dml.Chart.ST_Crosses.autoZero
                };
            }

            // 5️⃣ FIX X-AXIS CROSS
            foreach (var catAx in ctChart.plotArea.catAx)
            {
                catAx.crossesAt = null;
                catAx.crosses = new NPOI.OpenXmlFormats.Dml.Chart.CT_Crosses
                {
                    val = NPOI.OpenXmlFormats.Dml.Chart.ST_Crosses.autoZero
                };
            }

            // 6️⃣ ADD MARKERS (UI LOOK)
            if (ctChart.plotArea.lineChart?.Count > 0)
            {
                foreach (var ser in ctChart.plotArea.lineChart[0].ser)
                {
                    ser.marker ??= new NPOI.OpenXmlFormats.Dml.Chart.CT_Marker();
                    ser.marker.symbol = new NPOI.OpenXmlFormats.Dml.Chart.CT_MarkerStyle
                    {
                        val = NPOI.OpenXmlFormats.Dml.Chart.ST_MarkerStyle.circle
                    };
                    ser.marker.size = new NPOI.OpenXmlFormats.Dml.Chart.CT_MarkerSize { val = 5 };
                }
            }

            // 7️⃣ AUTO SIZE
            for (int i = 0; i < columnMappings.Count; i++)
                sheet.AutoSizeColumn(i);

            using var stream = new MemoryStream();
            workbook.Write(stream);
            return stream.ToArray();
        }

        public static async Task<byte[]> ExportExcelWithComboChartAsync(
     IEnumerable<VehicleDistanceExportDto> data,
     string sheetName = "Distance Report",
     string chartTitle = "Vehicle Distance Report")
        {
            if (data == null || !data.Any())
                return Array.Empty<byte>();

            var workbook = new XSSFWorkbook();
            var sheet = workbook.CreateSheet(sheetName);

            // =========================
            // HEADERS
            // =========================
            var header = sheet.CreateRow(0);
            header.CreateCell(0).SetCellValue("Month");
            header.CreateCell(1).SetCellValue("Distance (km)");
            header.CreateCell(2).SetCellValue("Trip Count");
            header.CreateCell(3).SetCellValue("Fuel Consumed");

            // =========================
            // DATA
            // =========================
            int rowIndex = 1;
            foreach (var d in data)
            {
                var row = sheet.CreateRow(rowIndex++);
                row.CreateCell(0).SetCellValue(d.Month);
                row.CreateCell(1).SetCellValue((double)d.DistanceKM);
                row.CreateCell(2).SetCellValue(d.TripCount);
                row.CreateCell(3).SetCellValue(d.FuelConsumed);
            }

            int rowCount = data.Count();

            var drawing = sheet.CreateDrawingPatriarch();

            var xRange = new CellRangeAddress(1, rowCount, 0, 0);
            var distanceRange = new CellRangeAddress(1, rowCount, 1, 1);
            var tripRange = new CellRangeAddress(1, rowCount, 2, 2);

            // =========================================================
            // ✅ CHART 1: DISTANCE (COLUMN CHART)
            // =========================================================
            var anchor1 = drawing.CreateAnchor(0, 0, 0, 0, 5, 1, 18, 12); // better spacing
            var chart1 = (XSSFChart)drawing.CreateChart(anchor1);

            chart1.SetTitle("Distance (km)");
            chart1.GetOrCreateLegend().Position = LegendPosition.Bottom;

            var bottomAxis1 = chart1.ChartAxisFactory.CreateCategoryAxis(AxisPosition.Bottom);
            var leftAxis1 = chart1.ChartAxisFactory.CreateValueAxis(AxisPosition.Left);

            var columnData = chart1.ChartDataFactory.CreateBarChartData<string, double>();

            var series1 = columnData.AddSeries(
                DataSources.FromStringCellRange(sheet, xRange),
                DataSources.FromNumericCellRange(sheet, distanceRange)
            );

            series1.SetTitle("Distance (km)");

            chart1.Plot(columnData, bottomAxis1, leftAxis1);

            // ✅ FIX: Force COLUMN direction (NPOI way)
            var ctChart1 = chart1.GetCTChart();

            if (ctChart1.plotArea.barChart != null && ctChart1.plotArea.barChart.Count > 0)
            {
                var barChart = ctChart1.plotArea.barChart[0];

                barChart.barDir = new NPOI.OpenXmlFormats.Dml.Chart.CT_BarDir
                {
                    val = NPOI.OpenXmlFormats.Dml.Chart.ST_BarDir.col
                };

                barChart.grouping = new NPOI.OpenXmlFormats.Dml.Chart.CT_BarGrouping
                {
                    val = NPOI.OpenXmlFormats.Dml.Chart.ST_BarGrouping.clustered
                };
            }

            // =========================================================
            // ✅ CHART 2: TRIP COUNT (LINE CHART)
            // =========================================================
            var anchor2 = drawing.CreateAnchor(0, 0, 0, 0, 5, 14, 18, 26); // pushed down → no overlap
            var chart2 = (XSSFChart)drawing.CreateChart(anchor2);

            chart2.SetTitle("Trip Count");
            chart2.GetOrCreateLegend().Position = LegendPosition.Bottom;

            var bottomAxis2 = chart2.ChartAxisFactory.CreateCategoryAxis(AxisPosition.Bottom);
            var leftAxis2 = chart2.ChartAxisFactory.CreateValueAxis(AxisPosition.Left);

            var lineData = chart2.ChartDataFactory.CreateLineChartData<string, double>();

            var series2 = lineData.AddSeries(
                DataSources.FromStringCellRange(sheet, xRange),
                DataSources.FromNumericCellRange(sheet, tripRange)
            );

            series2.SetTitle("Trip Count");

            chart2.Plot(lineData, bottomAxis2, leftAxis2);

            // ✅ Optional: add markers (UI-like look)
            var ctChart2 = chart2.GetCTChart();
            if (ctChart2.plotArea.lineChart?.Count > 0)
            {
                foreach (var ser in ctChart2.plotArea.lineChart[0].ser)
                {
                    ser.marker = new NPOI.OpenXmlFormats.Dml.Chart.CT_Marker();
                    ser.marker.symbol = new NPOI.OpenXmlFormats.Dml.Chart.CT_MarkerStyle
                    {
                        val = NPOI.OpenXmlFormats.Dml.Chart.ST_MarkerStyle.circle
                    };
                    ser.marker.size = new NPOI.OpenXmlFormats.Dml.Chart.CT_MarkerSize { val = 6 };
                }
            }

            // =========================
            // AUTO SIZE
            // =========================
            for (int i = 0; i < 4; i++)
                sheet.AutoSizeColumn(i);

            // =========================
            // SAVE
            // =========================
            using var stream = new MemoryStream();
            workbook.Write(stream);

            return await Task.FromResult(stream.ToArray());
        }

        public static async Task<byte[]> ExportDynamicPivotExcelWithChartAsync(
    List<Dictionary<string, object>> rows,
    string sheetName,
    string title)
        {
            if (rows == null || !rows.Any())
                return Array.Empty<byte>();


            var workbook = new XSSFWorkbook();
            var sheet = workbook.CreateSheet(sheetName);

            // -----------------------
            // TITLE
            // -----------------------
            var titleRow = sheet.CreateRow(0);
            titleRow.CreateCell(0).SetCellValue(title);

            // -----------------------
            // HEADER
            // -----------------------
            var headerRow = sheet.CreateRow(2);
            int colCount = rows.First().Keys.Count;

            int colIndex = 0;
            foreach (var key in rows.First().Keys)
            {
                headerRow.CreateCell(colIndex++).SetCellValue(key);
            }

            // ==========================
            // DATA
            // ==========================
            int rowIndex = 3;

            foreach (var row in rows)
            {
                var excelRow = sheet.CreateRow(rowIndex++);
                colIndex = 0;

                foreach (var val in row.Values)
                {
                    if (double.TryParse(val?.ToString(), out double num))
                        excelRow.CreateCell(colIndex++).SetCellValue(num);
                    else
                        excelRow.CreateCell(colIndex++).SetCellValue(val?.ToString());
                }
            }

            // ==========================
            // STYLES (UI LOOK)
            // ==========================
            var headerStyle = workbook.CreateCellStyle();
            headerStyle.FillForegroundColor = IndexedColors.DarkGreen.Index;
            headerStyle.FillPattern = FillPattern.SolidForeground;

            var headerFont = workbook.CreateFont();
            headerFont.Color = IndexedColors.White.Index;
            headerFont.IsBold = true;
            headerStyle.SetFont(headerFont);

            var totalStyle = workbook.CreateCellStyle();
            totalStyle.FillForegroundColor = IndexedColors.LightGreen.Index;
            totalStyle.FillPattern = FillPattern.SolidForeground;

            var boldFont = workbook.CreateFont();
            boldFont.IsBold = true;
            totalStyle.SetFont(boldFont);

            // ==========================
            // APPLY HEADER STYLE
            // ==========================
            for (int i = 0; i < colCount; i++)
            {
                headerRow.GetCell(i).CellStyle = headerStyle;
            }

            // ==========================
            // TOTAL ROW
            // ==========================
            var totalRow = sheet.CreateRow(rowIndex);

            totalRow.CreateCell(0).SetCellValue("Total");

            for (int c = 1; c < colCount; c++)
            {
                double sum = 0;
                for (int r = 3; r < rowIndex; r++)
                {
                    var cell = sheet.GetRow(r).GetCell(c);
                    if (cell != null && cell.CellType == CellType.Numeric)
                    {
                        sum += cell.NumericCellValue;
                    }
                }
                totalRow.CreateCell(c).SetCellValue(sum);
            }

            // style total row
            for (int i = 0; i < colCount; i++)
            {
                totalRow.GetCell(i).CellStyle = totalStyle;
            }

            rowIndex++; // move past total row

            // ==========================
            // AUTO SIZE COLUMNS
            // ==========================
            for (int i = 0; i < colCount; i++)
                sheet.AutoSizeColumn(i);

            // ==========================
            // WRITE TO STREAM
            // ==========================
            using var stream = new MemoryStream();
            workbook.Write(stream);

            return await Task.FromResult(stream.ToArray());
        }

public static async Task<byte[]> ExportVehicleTypePieChartAsync(
    List<string> labels,
    List<decimal> values,
    string sheetName = "Sheet1",
    string chartTitle = "Pie Chart Report")
    {
        if (labels == null || values == null || !labels.Any() || !values.Any())
            return Array.Empty<byte>();

        // =====================================================
        // STEP 1 — Custom Colors
        // =====================================================
        var sliceColors = new List<string>
    {
        "4472C4", // Bike    → Blue
        "70AD47", // Bus     → Green
        "ED7D31", // Car     → Orange
        "E91E8C", // Tractor → Pink
        "7B61C4", // Truck   → Purple
        "FF0000", // fallback
        "00B0F0",
        "FFFF00"
    };

        var workbook = new XSSFWorkbook();
        var sheet = workbook.CreateSheet(sheetName);

            // =====================================================
            // STEP 2 — Headers (Styled)
            // =====================================================
            int tableFontSize = 14; // ← YAHAN SE CONTROL KARO (bada = 16, chota = 11)
            int rowHeightPt = 22; // ← Row height points mein

            // Header Font + Style
            var headerFont = workbook.CreateFont();
            headerFont.IsBold = true;
            headerFont.FontHeightInPoints = (short)tableFontSize;
            headerFont.FontName = "Calibri";

            var headerStyle = workbook.CreateCellStyle();
            headerStyle.SetFont(headerFont);
            headerStyle.FillForegroundColor = NPOI.HSSF.Util.HSSFColor.Grey25Percent.Index;
            headerStyle.FillPattern = FillPattern.SolidForeground;
            headerStyle.BorderBottom = BorderStyle.Medium;
            headerStyle.BorderTop = BorderStyle.Medium;
            headerStyle.BorderLeft = BorderStyle.Medium;
            headerStyle.BorderRight = BorderStyle.Medium;
            headerStyle.Alignment = HorizontalAlignment.Center;

            var headerRow = sheet.CreateRow(0);
            headerRow.HeightInPoints = (short)rowHeightPt;

            var h0 = headerRow.CreateCell(0);
            var h1 = headerRow.CreateCell(1);
            h0.SetCellValue("Category");
            h1.SetCellValue("Value");
            h0.CellStyle = headerStyle;
            h1.CellStyle = headerStyle;

            // =====================================================
            // STEP 3 — Data Rows (Styled)
            // =====================================================

            // Data Font + Style
            var dataFont = workbook.CreateFont();
            dataFont.FontHeightInPoints = (short)tableFontSize;
            dataFont.FontName = "Calibri";

            var dataStyle = workbook.CreateCellStyle();
            dataStyle.SetFont(dataFont);
            dataStyle.BorderBottom = BorderStyle.Thin;
            dataStyle.BorderTop = BorderStyle.Thin;
            dataStyle.BorderLeft = BorderStyle.Thin;
            dataStyle.BorderRight = BorderStyle.Thin;
            dataStyle.Alignment = HorizontalAlignment.Left;

            // Value cell right-align
            var valueStyle = workbook.CreateCellStyle();
            valueStyle.SetFont(dataFont);
            valueStyle.BorderBottom = BorderStyle.Thin;
            valueStyle.BorderTop = BorderStyle.Thin;
            valueStyle.BorderLeft = BorderStyle.Thin;
            valueStyle.BorderRight = BorderStyle.Thin;
            valueStyle.Alignment = HorizontalAlignment.Right;

            int rowIndex = 1;
            for (int i = 0; i < labels.Count; i++)
            {
                var row = sheet.CreateRow(rowIndex++);
                row.HeightInPoints = (short)rowHeightPt; // ← Row height apply

                var c0 = row.CreateCell(0);
                var c1 = row.CreateCell(1);

                c0.SetCellValue(labels[i]);
                c1.SetCellValue((double)values[i]);

                c0.CellStyle = dataStyle;
                c1.CellStyle = valueStyle;
            }

            int rowCount = labels.Count;

            //// =====================================================
            //// STEP 2 — Headers
            //// =====================================================
            //var headerRow = sheet.CreateRow(0);
            //headerRow.CreateCell(0).SetCellValue("Category");
            //headerRow.CreateCell(1).SetCellValue("Value");

            //// =====================================================
            //// STEP 3 — Data Rows
            //// =====================================================
            //int rowIndex = 1;
            //for (int i = 0; i < labels.Count; i++)
            //{
            //    var row = sheet.CreateRow(rowIndex++);
            //    row.CreateCell(0).SetCellValue(labels[i]);
            //    row.CreateCell(1).SetCellValue((double)values[i]);
            //}

            //int rowCount = labels.Count;

            // =====================================================
            // STEP 4 — Chart Drawing Area
            // =====================================================
            var drawing = sheet.CreateDrawingPatriarch();
        var anchor = drawing.CreateAnchor(0, 0, 0, 0, 6, 1, 17, 24);

        var chart = (XSSFChart)drawing.CreateChart(anchor);
        chart.SetTitle(chartTitle);
        chart.GetOrCreateLegend().Position = LegendPosition.Bottom;


        var categories = DataSources.FromStringCellRange(
            sheet, new CellRangeAddress(1, rowCount, 0, 0));

        var dataValues = DataSources.FromNumericCellRange(
            sheet, new CellRangeAddress(1, rowCount, 1, 1));

        // =====================================================
        // STEP 5 — Plot Pie Chart
        // =====================================================
        var pieData = chart.ChartDataFactory.CreatePieChartData<string, double>();
        var series = pieData.AddSeries(categories, dataValues);
        series.SetTitle(chartTitle);
        chart.Plot(pieData);

        // =====================================================
        // STEP 6 — CT Level: Labels + Custom Colors
        // =====================================================
        var ctChart = chart.GetCTChart();
        var plotArea = ctChart.plotArea;

        if (plotArea.pieChart != null && plotArea.pieChart.Count > 0)
        {
            var pieChart = plotArea.pieChart[0];

            // ----- DATA LABELS -----
            //pieChart.dLbls = new CT_DLbls();
            //pieChart.dLbls.showVal = new CT_Boolean { val = 1 };
            //pieChart.dLbls.showPercent = new CT_Boolean { val = 1 };
            //pieChart.dLbls.showLegendKey = new CT_Boolean { val = 0 };
            //pieChart.dLbls.showCatName = new CT_Boolean { val = 0 };
            //pieChart.dLbls.showSerName = new CT_Boolean { val = 0 };

                // ----- DATA LABELS (Category + Value + Percentage) -----
            pieChart.dLbls = new CT_DLbls();
            pieChart.dLbls.showVal = new CT_Boolean { val = 1 };   // ✅ Value dikhao
            pieChart.dLbls.showPercent = new CT_Boolean { val = 1 };   // ✅ % dikhao
            pieChart.dLbls.showCatName = new CT_Boolean { val = 1 };   // ✅ Category name dikhao (Bike, Bus etc.)
            pieChart.dLbls.showLegendKey = new CT_Boolean { val = 0 };   // ❌ Legend key mat dikhao
            pieChart.dLbls.showSerName = new CT_Boolean { val = 0 };   // ❌ Series name mat dikhao (yahi Image 2 ka problem tha)
            pieChart.dLbls.showLeaderLines = new CT_Boolean { val = 1 };  // ✅ Leader lines (line from label to slice)

                // ----- CUSTOM COLORS PER SLICE -----
                if (pieChart.ser != null && pieChart.ser.Count > 0)
            {
                var ser = pieChart.ser[0];
                ser.dPt = new List<CT_DPt>();

                for (int i = 0; i < labels.Count; i++)
                {
                    string hexColor = i < sliceColors.Count ? sliceColors[i] : "CCCCCC";

                    var dpt = new CT_DPt();
                    dpt.idx = new CT_UnsignedInt { val = (uint)i };
                    dpt.bubble3D = new CT_Boolean { val = 0 };

                    // ✅ FIXED: Correct namespace for CT_ShapeProperties
                    dpt.spPr = new NPOI.OpenXmlFormats.Dml.Chart.CT_ShapeProperties();

                    // ✅ FIXED: DmlFill alias = NPOI.OpenXmlFormats.Dml.CT_SolidColorFillProperties
                    dpt.spPr.solidFill = new DmlFill();
                    dpt.spPr.solidFill.srgbClr = new DmlColor
                    {
                        val = HexStringToByteArray(hexColor)
                    };

                    // ✅ FIXED: DmlLine alias = NPOI.OpenXmlFormats.Dml.CT_LineProperties
                    dpt.spPr.ln = new DmlLine();
                    dpt.spPr.ln.solidFill = new DmlFill();
                    dpt.spPr.ln.solidFill.srgbClr = new DmlColor
                    {
                        val = HexStringToByteArray(hexColor)
                    };

                    ser.dPt.Add(dpt);
                }
            }
        }

        // =====================================================
        // STEP 7 — Convert to Donut Style via XML
        // =====================================================
        ApplyDoughnutStyle(chart, labelFontSize: 20);


            // =====================================================
            // STEP 8 — Auto Size Columns
            // =====================================================

            // =====================================================
            // STEP 8 — Column Width (Manual - AutoSize se better control)
            // =====================================================
            sheet.SetColumnWidth(0, 20 * 256); // Category column — 20 characters wide
            sheet.SetColumnWidth(1, 15 * 256); // Value column    — 15 characters wide

        //    sheet.AutoSizeColumn(0);
        //sheet.AutoSizeColumn(1);

        using var stream = new MemoryStream();
        workbook.Write(stream);
        return stream.ToArray();
    }

    // =====================================================
    // HELPER 1 — HEX → byte[]
    // =====================================================
    private static byte[] HexStringToByteArray(string hex)
    {
        hex = hex.Replace("#", "");
        return new byte[]
        {
        Convert.ToByte(hex.Substring(0, 2), 16),
        Convert.ToByte(hex.Substring(2, 2), 16),
        Convert.ToByte(hex.Substring(4, 2), 16)
        };
    }

    // =====================================================
    // HELPER 2 — Pie → Donut via XML string replace
    // =====================================================
    private static void ApplyDoughnutStyle(XSSFChart chart, int labelFontSize = 11)
{
    try
    {
        var part = chart.GetPackagePart();

        string xml;
        using (var inputStream = part.GetInputStream())
        using (var reader = new StreamReader(inputStream, Encoding.UTF8))
        {
            xml = reader.ReadToEnd();
        }

        if (xml.Contains("<c:pieChart>"))
        {
            // ✅ Pie → Donut
            xml = xml.Replace(
                "<c:pieChart>",
                "<c:doughnutChart><c:holeSize val=\"50\"/>"
            );
            xml = xml.Replace("</c:pieChart>", "</c:doughnutChart>");
        }

        // ✅ Label font size inject karo (txPr XML inject before </c:dLbls>)
        // Font size in EMUs — 100 = 1pt, isliye 11pt = 1100
        int fontSizeVal = labelFontSize * 100;
        string fontXml = $@"<c:txPr>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr>
              <a:defRPr sz=""{fontSizeVal}"" b=""0""/>
            </a:pPr>
          </a:p>
        </c:txPr>";

        xml = xml.Replace("</c:dLbls>", fontXml + "</c:dLbls>");

        using var outputStream = part.GetOutputStream();
        using var writer = new StreamWriter(outputStream, Encoding.UTF8);
        writer.Write(xml);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Donut conversion failed: {ex.Message}");
    }
}

    //        public static async Task<byte[]> ExportVehicleTypePieChartAsync(
    //List<string> labels,
    //List<decimal> values,
    //string sheetName = "Sheet1",
    //string chartTitle = "Pie Chart Report")
    //        {
    //            if (labels == null || values == null || !labels.Any() || !values.Any())
    //                return Array.Empty<byte>();

    //            var workbook = new XSSFWorkbook();
    //            var sheet = workbook.CreateSheet(sheetName);

    //            // =========================
    //            // :one: HEADERS
    //            // =========================
    //            var headerRow = sheet.CreateRow(0);
    //            headerRow.CreateCell(0).SetCellValue("Category");
    //            headerRow.CreateCell(1).SetCellValue("Value");

    //            // =========================
    //            // :two: DATA
    //            // =========================
    //            int rowIndex = 1;

    //            for (int i = 0; i < labels.Count; i++)
    //            {
    //                var row = sheet.CreateRow(rowIndex++);
    //                row.CreateCell(0).SetCellValue(labels[i]);
    //                row.CreateCell(1).SetCellValue((double)values[i]);
    //            }

    //            int rowCount = labels.Count;

    //            // =========================
    //            // :three: CHART
    //            // =========================
    //            var drawing = sheet.CreateDrawingPatriarch();

    //            var anchor = drawing.CreateAnchor(0, 0, 0, 0, 3, 1, 12, 20);
    //            var chart = (XSSFChart)drawing.CreateChart(anchor);

    //            chart.SetTitle(chartTitle);
    //            chart.GetOrCreateLegend().Position = LegendPosition.Right;

    //            var categories = DataSources.FromStringCellRange(
    //            sheet,
    //            new CellRangeAddress(1, rowCount, 0, 0)
    //            );

    //            var dataValues = DataSources.FromNumericCellRange(
    //            sheet,
    //            new CellRangeAddress(1, rowCount, 1, 1)
    //            );

    //            var pieData = chart.ChartDataFactory.CreatePieChartData<string, double>();

    //            var series = pieData.AddSeries(categories, dataValues);
    //            series.SetTitle(chartTitle);

    //            chart.Plot(pieData);

    //            // =========================
    //            // :fire: LABELS (VALUE + %)
    //            // =========================
    //            var ctChart = chart.GetCTChart();

    //            if (ctChart.plotArea.pieChart != null && ctChart.plotArea.pieChart.Count > 0)
    //            {
    //                var pieChart = ctChart.plotArea.pieChart[0];

    //                pieChart.dLbls = new CT_DLbls();
    //                pieChart.dLbls.showVal = new CT_Boolean { val = 1 };
    //                pieChart.dLbls.showPercent = new CT_Boolean { val = 1 };
    //            }

    //            // =========================
    //            // AUTO SIZE
    //            // =========================
    //            sheet.AutoSizeColumn(0);
    //            sheet.AutoSizeColumn(1);

    //            using var stream = new MemoryStream();
    //            workbook.Write(stream);

    //            return stream.ToArray();
    //        }

    public static async Task<byte[]> ExportCityWiseEmissionStackedBarChartAsync(
    List<string> cities,
    List<decimal> co2Values,
    List<decimal> no2Values,
    List<decimal> ch4Values,
    string sheetName = "City Emission Report",
    string chartTitle = "City Wise Emission Profile")
{
    if (cities == null || !cities.Any())
        return Array.Empty<byte>();

    var workbook = new XSSFWorkbook();
    var sheet = workbook.CreateSheet(sheetName);

    // =========================
    // 1️⃣ HEADERS — Bold Style
    // =========================
    var headerStyle = workbook.CreateCellStyle();
    var headerFont = workbook.CreateFont();
    headerFont.IsBold = true;
    headerStyle.SetFont(headerFont);

    var headerRow = sheet.CreateRow(0);

    var h0 = headerRow.CreateCell(0);
    h0.SetCellValue("City");
    h0.CellStyle = headerStyle;

    var h1 = headerRow.CreateCell(1);
    h1.SetCellValue("CO2 (kg)");
    h1.CellStyle = headerStyle;

    var h2 = headerRow.CreateCell(2);
    h2.SetCellValue("NO2 (kg)");
    h2.CellStyle = headerStyle;

    var h3 = headerRow.CreateCell(3);
    h3.SetCellValue("CH4 (kg)");
    h3.CellStyle = headerStyle;

    // =========================
    // 2️⃣ DATA ROWS
    // =========================
    int rowIndex = 1;
    for (int i = 0; i < cities.Count; i++)
    {
        var row = sheet.CreateRow(rowIndex++);
        row.CreateCell(0).SetCellValue(cities[i]);
        row.CreateCell(1).SetCellValue((double)co2Values[i]);
        row.CreateCell(2).SetCellValue((double)no2Values[i]);
        row.CreateCell(3).SetCellValue((double)ch4Values[i]);
    }

    int rowCount = cities.Count;

    // =========================
    // 3️⃣ STACKED BAR CHART
    // =========================
    var drawing = sheet.CreateDrawingPatriarch();
    var anchor = drawing.CreateAnchor(0, 0, 0, 0, 5, 1, 18, 24);
    var chart = (XSSFChart)drawing.CreateChart(anchor);

    chart.SetTitle(chartTitle);
    chart.GetOrCreateLegend().Position = LegendPosition.Bottom;

    var dataFactory = chart.ChartDataFactory;
    var axisFactory = chart.ChartAxisFactory;

    // Axes
    var bottomAxis = axisFactory.CreateCategoryAxis(AxisPosition.Bottom);
    var leftAxis = axisFactory.CreateValueAxis(AxisPosition.Left);
    leftAxis.Crosses = AxisCrosses.AutoZero;

    // Bar Chart Data
    var barData = dataFactory.CreateBarChartData<string, double>();

    // Category (X-axis) = City names
    var categoryRange = DataSources.FromStringCellRange(
        sheet, new CellRangeAddress(1, rowCount, 0, 0));

    // CO2 Series
    var co2Range = DataSources.FromNumericCellRange(
        sheet, new CellRangeAddress(1, rowCount, 1, 1));
    var co2Series = barData.AddSeries(categoryRange, co2Range);
    co2Series.SetTitle("CO2 (kg)");

    // NO2 Series
    var no2Range = DataSources.FromNumericCellRange(
        sheet, new CellRangeAddress(1, rowCount, 2, 2));
    var no2Series = barData.AddSeries(categoryRange, no2Range);
    no2Series.SetTitle("NO2 (kg)");

    // CH4 Series
    var ch4Range = DataSources.FromNumericCellRange(
        sheet, new CellRangeAddress(1, rowCount, 3, 3));
    var ch4Series = barData.AddSeries(categoryRange, ch4Range);
    ch4Series.SetTitle("CH4 (kg)");

    chart.Plot(barData, bottomAxis, leftAxis);

    // =========================
    // 4️⃣ STACKED BAR — XML LEVEL
    // =========================
    var ctChart = chart.GetCTChart();

    if (ctChart.plotArea.barChart != null && ctChart.plotArea.barChart.Count > 0)
    {
        var barChart = ctChart.plotArea.barChart[0];

        barChart.barDir = new CT_BarDir { val = ST_BarDir.col };
        barChart.grouping = new CT_BarGrouping { val = ST_BarGrouping.stacked };
        barChart.overlap = new CT_Overlap { val = 100 };

        barChart.dLbls = new CT_DLbls
        {
            showVal = new CT_Boolean { val = 0 },
            showPercent = new CT_Boolean { val = 0 },
            showLegendKey = new CT_Boolean { val = 0 },
            showSerName = new CT_Boolean { val = 0 },
            showCatName = new CT_Boolean { val = 0 }
        };
    }

    // ✅ FIX 1: Bottom gap hatao — valAx ko 0 se start karo
    var valAxList = ctChart.plotArea.valAx;
    if (valAxList != null && valAxList.Count > 0)
    {
        var valAx = valAxList[0];

        valAx.scaling = new CT_Scaling
        {
            orientation = new CT_Orientation { val = ST_Orientation.minMax },
            min = new CT_Double { val = 0 }
        };

        valAx.crossBetween = new CT_CrossBetween { val = ST_CrossBetween.between };
    }

    // ✅ FIX 2: Column widths — wider
    sheet.SetColumnWidth(0, 5000);  // City
    sheet.SetColumnWidth(1, 4500);  // CO2 (kg)
    sheet.SetColumnWidth(2, 4500);  // NO2 (kg)
    sheet.SetColumnWidth(3, 4500);  // CH4 (kg)

    using var stream = new MemoryStream();
    workbook.Write(stream);
    return stream.ToArray();
}
        public static async Task<byte[]> ExportExcelWithClusteredBarChartAsync<T>(
    IEnumerable<T> data,
    Dictionary<string, string> columnMappings,
    string sheetName = "Sheet1",
    string chartTitle = "Report Chart")
{
    if (!data.Any())
        return Array.Empty<byte>();

    var workbook = new XSSFWorkbook();
    var sheet = workbook.CreateSheet(sheetName);

    // 1️⃣ HEADERS
    var headerRow = sheet.CreateRow(0);
    int col = 0;
    foreach (var header in columnMappings.Keys)
        headerRow.CreateCell(col++).SetCellValue(header);

    // 2️⃣ DATA
    int rowIdx = 1;
    foreach (var item in data)
    {
        var row = sheet.CreateRow(rowIdx++);
        col = 0;
        foreach (var propName in columnMappings.Values)
        {
            var prop = typeof(T).GetProperty(propName);
            var val  = prop?.GetValue(item);
            var cell = row.CreateCell(col++);

            if (val is double d)         cell.SetCellValue(d);
            else if (val is int i)       cell.SetCellValue(i);
            else if (val is decimal dec) cell.SetCellValue((double)dec);
            else                         cell.SetCellValue(val?.ToString());
        }
    }

    // 3️⃣ CHART
    var drawing = sheet.CreateDrawingPatriarch();

    // ✅ Fixed anchor — data columns ke baad space de ke chart banao
    var anchor = drawing.CreateAnchor(0, 0, 0, 0, col + 2, 1, col + 16, 25);

    var chart = (XSSFChart)drawing.CreateChart(anchor);
    chart.SetTitle(chartTitle);
    chart.GetOrCreateLegend().Position = LegendPosition.Bottom;

    var bottomAxis = chart.CreateCategoryAxis(AxisPosition.Bottom);
    var leftAxis   = chart.CreateValueAxis(AxisPosition.Left);

    // Y-axis max
    var numericProps = columnMappings.Values.Skip(1).ToList();
    var allValues = data
        .SelectMany(x => numericProps.Select(p =>
        {
            var prop = typeof(T).GetProperty(p);
            return Convert.ToDouble(prop?.GetValue(x) ?? 0);
        }))
        .Where(v => v > 0)
        .DefaultIfEmpty(0)
        .ToList();

    double maxValue = allValues.Any() ? allValues.Max() : 100;

    var dataFactory = chart.ChartDataFactory;
    var chartData   = dataFactory.CreateBarChartData<string, double>();

    int rowCount   = data.Count();
    var xAxisRange = new CellRangeAddress(1, rowCount, 0, 0);

    int seriesCol = 1;
    foreach (var header in columnMappings.Keys.Skip(1))
    {
        var yRange = new CellRangeAddress(1, rowCount, seriesCol, seriesCol);
        chartData.AddSeries(
            DataSources.FromStringCellRange(sheet, xAxisRange),
            DataSources.FromNumericCellRange(sheet, yRange)
        ).SetTitle(header);
        seriesCol++;
    }

    chart.Plot(chartData, bottomAxis, leftAxis);

    var ctChart  = chart.GetCTChart();
    double axisMax = Math.Ceiling(maxValue / 100) * 100;

    // Y-axis scale fix
    foreach (var valAx in ctChart.plotArea.valAx)
    {
        valAx.scaling = new CT_Scaling
        {
            orientation = new CT_Orientation { val = ST_Orientation.minMax },
            min = new CT_Double { val = 0 },
            max = new CT_Double { val = axisMax }
        };
        valAx.crossesAt = null;
        valAx.crosses   = new CT_Crosses { val = ST_Crosses.autoZero };

        // ✅ THE REAL FIX:
        // crossBetween = "between" → Y-axis bars ke BEECH cross karta hai
        // Iska matlab Jan ka bar properly left side pe space ke saath render hoga
        // "midPt" (default) → axis pehli category KE UPAR se guzarti hai = Jan cut
        valAx.crossBetween = new CT_CrossBetween
        {
            val = ST_CrossBetween.between
        };
    }

    // X-axis basic fix
    foreach (var catAx in ctChart.plotArea.catAx)
    {
        catAx.crossesAt  = null;
        catAx.crosses    = new CT_Crosses    { val = ST_Crosses.autoZero  };
        catAx.axPos      = new CT_AxPos      { val = ST_AxPos.b           };
        catAx.tickLblPos = new CT_TickLblPos { val = ST_TickLblPos.nextTo };
    }

    // Clustered bar
    if (ctChart.plotArea.barChart != null && ctChart.plotArea.barChart.Count > 0)
    {
        var barChart = ctChart.plotArea.barChart[0];
        barChart.barDir   = new CT_BarDir     { val = ST_BarDir.col            };
        barChart.grouping = new CT_BarGrouping { val = ST_BarGrouping.clustered };
        barChart.overlap  = new CT_Overlap    { val = 0   };
        barChart.gapWidth = new CT_GapAmount  { val = 150 };
    }

            for (int i = 0; i < columnMappings.Count; i++)
                sheet.AutoSizeColumn(i);

            for (int i = 0; i < columnMappings.Count; i++)
            {
                int currentWidth = sheet.GetColumnWidth(i);
                sheet.SetColumnWidth(i, currentWidth + 1500);
            }

            for (int i = 0; i <= rowIdx; i++)
            {
                var row = sheet.GetRow(i);
                if (row != null)
                    row.HeightInPoints = 16;
            }

            using var stream = new MemoryStream();
            workbook.Write(stream);
            return stream.ToArray();
        }

        public static async Task<byte[]> ExportGeneratorRunHoursPivotAsync(
    List<Dictionary<string, object>> rows,
    List<string> monthLabels,
    string sheetName,
    string title)
        {
            if (rows == null || !rows.Any())
                return Array.Empty<byte>();

            var workbook = new XSSFWorkbook();
            var sheet = workbook.CreateSheet(sheetName);

            // ── STYLES ────────────────────────────────────────────────────────
            // HEADER STYLE (Natural light gray)
            var headerStyle = workbook.CreateCellStyle();
            headerStyle.FillForegroundColor = IndexedColors.Grey25Percent.Index;
            headerStyle.FillPattern = FillPattern.SolidForeground;
            var headerFont = workbook.CreateFont();
            headerFont.Color = IndexedColors.Black.Index;
            headerFont.IsBold = true;
            headerStyle.SetFont(headerFont);
            headerStyle.Alignment = HorizontalAlignment.Center;

            // TOTAL COLUMN STYLE (soft subtle gray)
            var totalColStyle = workbook.CreateCellStyle();
            totalColStyle.FillForegroundColor = IndexedColors.Grey50Percent.Index;
            totalColStyle.FillPattern = FillPattern.SolidForeground;
            var totalColFont = workbook.CreateFont();
            totalColFont.IsBold = true;
            totalColFont.Color = IndexedColors.Black.Index;
            totalColStyle.SetFont(totalColFont);
            totalColStyle.Alignment = HorizontalAlignment.Right;

            // TOTAL ROW STYLE (slightly highlighted but clean)
            var totalRowStyle = workbook.CreateCellStyle();
            totalRowStyle.FillForegroundColor = IndexedColors.Grey25Percent.Index;
            totalRowStyle.FillPattern = FillPattern.SolidForeground;
            var totalRowFont = workbook.CreateFont();
            totalRowFont.IsBold = true;
            totalRowFont.Color = IndexedColors.Black.Index;
            totalRowStyle.SetFont(totalRowFont);
            totalRowStyle.Alignment = HorizontalAlignment.Right;

            // DATA CELL STYLE (clean white)
            var dataStyle = workbook.CreateCellStyle();
            dataStyle.Alignment = HorizontalAlignment.Center;

            // GENERATOR NAME STYLE
            var genNameStyle = workbook.CreateCellStyle();
            genNameStyle.Alignment = HorizontalAlignment.Left;

            // ── TITLE ROW ─────────────────────────────────────────────────────
            var titleRow = sheet.CreateRow(0);
            titleRow.CreateCell(0).SetCellValue(title);

            // ── HEADER ROW ────────────────────────────────────────────────────
            var headerRow = sheet.CreateRow(2);
            var allColumns = rows.First().Keys.ToList(); // Generator + months + Total
            int colCount = allColumns.Count;

            for (int c = 0; c < colCount; c++)
            {
                var cell = headerRow.CreateCell(c);
                cell.SetCellValue(allColumns[c].ToUpper()); // UI mein uppercase headers
                cell.CellStyle = headerStyle;
            }

            // ── DATA ROWS ─────────────────────────────────────────────────────
            int rowIndex = 3;
            int totalRowIdx = rows.Count - 1; // last row = Total row

            for (int ri = 0; ri < rows.Count; ri++)
            {
                var excelRow = sheet.CreateRow(rowIndex++);
                var rowData = rows[ri];
                bool isTotalRow = ri == totalRowIdx;

                int ci = 0;
                foreach (var kvp in rowData)
                {
                    var cell = excelRow.CreateCell(ci);

                    if (kvp.Value is string s)
                    {
                        cell.SetCellValue(s);
                    }
                    else if (kvp.Value is decimal d)
                    {
                        cell.SetCellValue((double)d);
                    }
                    else
                    {
                        cell.SetCellValue(kvp.Value?.ToString() ?? "—");
                    }

                    // ✅ Style apply
                    if (isTotalRow)
                        cell.CellStyle = totalRowStyle;
                    else if (ci == colCount - 1) // last column = Total (Hrs)
                        cell.CellStyle = totalColStyle;
                    else if (ci == 0)
                        cell.CellStyle = genNameStyle;
                    else
                        cell.CellStyle = dataStyle;

                    ci++;
                }
            }

            sheet.SetColumnWidth(0, 7000);
            for (int i = 1; i < colCount - 1; i++)
                sheet.SetColumnWidth(i, 2800);
            sheet.SetColumnWidth(colCount - 1, 4500);

            using var stream = new MemoryStream();
            workbook.Write(stream);
            return await Task.FromResult(stream.ToArray());
        }


        public static async Task<byte[]> ExportGeneratorDonutChartAsync(
    List<string> labels,
    List<decimal> values,
    string sheetName = "Sheet1",
    string chartTitle = "Generator Run Hours Distribution")
        {
            if (labels == null || values == null || !labels.Any() || !values.Any())
                return Array.Empty<byte>();

            var workbook = new XSSFWorkbook();
            var sheet = workbook.CreateSheet(sheetName);

            // =========================
            // 1️⃣ HEADERS
            // =========================
            var headerRow = sheet.CreateRow(0);
            headerRow.CreateCell(0).SetCellValue("Category");
            headerRow.CreateCell(1).SetCellValue("Value");

            // =========================
            // 2️⃣ DATA + %
            // =========================
            double total = (double)values.Sum();

            for (int i = 0; i < labels.Count; i++)
            {
                double val = (double)values[i];
                double percent = total == 0 ? 0 : (val / total) * 100;

                var row = sheet.CreateRow(i + 1);
                row.CreateCell(0).SetCellValue($"{labels[i]} ({percent:0}%)");
                row.CreateCell(1).SetCellValue(val);
            }

            int lastRowIndex = labels.Count;

            // =========================
            // 3️⃣ CHART
            // =========================
            var drawing = sheet.CreateDrawingPatriarch();
            var anchor = drawing.CreateAnchor(0, 0, 0, 0, 3, 1, 15, 25);

            var chart = (XSSFChart)drawing.CreateChart(anchor);
            chart.SetTitle(chartTitle);

            var legend = chart.GetOrCreateLegend();
            legend.Position = LegendPosition.Right;

            var categories = DataSources.FromStringCellRange(sheet, new CellRangeAddress(1, lastRowIndex, 0, 0));
            var dataValues = DataSources.FromNumericCellRange(sheet, new CellRangeAddress(1, lastRowIndex, 1, 1));

            var pieData = chart.ChartDataFactory.CreatePieChartData<string, double>();
            var series = pieData.AddSeries(categories, dataValues);
            series.SetTitle(chartTitle);

            chart.Plot(pieData);

            // =========================
            // 4️⃣ LEGEND FONT SIZE FIX (SAFE)
            // =========================
            try
            {
                var ctChart = chart.GetCTChart();

                if (ctChart.legend != null)
                {
                    if (ctChart.legend.txPr == null)
                        ctChart.legend.txPr = new NPOI.OpenXmlFormats.Dml.Chart.CT_TextBody();

                    var txPr = ctChart.legend.txPr;

                    if (txPr.bodyPr == null)
                        txPr.bodyPr = new NPOI.OpenXmlFormats.Dml.CT_TextBodyProperties();

                    if (txPr.lstStyle == null)
                        txPr.lstStyle = new NPOI.OpenXmlFormats.Dml.CT_TextListStyle();

                    // Clear existing paragraphs (important fix)
                    txPr.p = new List<NPOI.OpenXmlFormats.Dml.CT_TextParagraph>();

                    var p = new NPOI.OpenXmlFormats.Dml.CT_TextParagraph();
                    var pPr = new NPOI.OpenXmlFormats.Dml.CT_TextParagraphProperties();
                    var defRPr = new NPOI.OpenXmlFormats.Dml.CT_TextCharacterProperties();

                    defRPr.sz = 1400; // 🔥 14pt

                    pPr.defRPr = defRPr;
                    p.pPr = pPr;

                    txPr.p.Add(p);
                }
            }
            catch
            {
                // Ignore - kuch versions me ye supported nahi hota
            }
            var ctPlotArea = chart.GetCTChart().plotArea;

            if (ctPlotArea.pieChart != null && ctPlotArea.pieChart.Count > 0)
            {
                var pieChart = ctPlotArea.pieChart[0];

                pieChart.dLbls = new CT_DLbls();
                pieChart.dLbls.showVal = new CT_Boolean { val = 0 };
                pieChart.dLbls.showPercent = new CT_Boolean { val = 0 };
                pieChart.dLbls.showCatName = new CT_Boolean { val = 0 };
                pieChart.dLbls.showSerName = new CT_Boolean { val = 0 };
                pieChart.dLbls.showLegendKey = new CT_Boolean { val = 0 };
            }

            sheet.SetColumnWidth(0, 50 * 256); // Category wide
            sheet.SetColumnWidth(1, 20 * 256); // Value wide

            using var stream = new MemoryStream();
            workbook.Write(stream);
            return stream.ToArray();
        }
        public static byte[] ExportExactUIChart(
    List<string> sites,
    List<double> co2e,
    List<double> co2,
    List<double> no2,
    List<double> ch4)
        {
            var wb = new XSSFWorkbook();
            var sheet = wb.CreateSheet("Report");

            // =========================
            // DATA
            // =========================
            var header = sheet.CreateRow(0);
            header.CreateCell(0).SetCellValue("Site");
            header.CreateCell(1).SetCellValue("CO2e");
            header.CreateCell(2).SetCellValue("CO2");
            header.CreateCell(3).SetCellValue("NO2");
            header.CreateCell(4).SetCellValue("CH4");

            for (int i = 0; i < sites.Count; i++)
            {
                var r = sheet.CreateRow(i + 1);
                r.CreateCell(0).SetCellValue(sites[i]);
                r.CreateCell(1).SetCellValue(co2e[i]);
                r.CreateCell(2).SetCellValue(co2[i]);
                r.CreateCell(3).SetCellValue(no2[i]);
                r.CreateCell(4).SetCellValue(ch4[i]);
            }

            int rowCount = sites.Count;

            // =========================
            // CREATE CHART
            // =========================
            var drawing = sheet.CreateDrawingPatriarch();
            var anchor = drawing.CreateAnchor(0, 0, 0, 0, 6, 1, 20, 25);
            var chart = (XSSFChart)drawing.CreateChart(anchor);
            chart.SetTitle("Site Wise Emission Profile");
            chart.GetOrCreateLegend().Position = LegendPosition.Bottom;

            // PRIMARY axes (left) — CO2e ke liye
            var bottomAxis = chart.CreateCategoryAxis(AxisPosition.Bottom);
            var leftAxis = chart.CreateValueAxis(AxisPosition.Left);

            // SECONDARY axis (right) — CO2, NO2, CH4 ke liye
            var rightAxis = chart.CreateValueAxis(AxisPosition.Right);

            var x = DataSources.FromStringCellRange(sheet, new CellRangeAddress(1, rowCount, 0, 0));

            // =========================
            // SERIES 1: CO2e — PRIMARY (left) axis
            // =========================
            var barData1 = chart.ChartDataFactory.CreateBarChartData<string, double>();
            barData1.AddSeries(x,
                DataSources.FromNumericCellRange(sheet, new CellRangeAddress(1, rowCount, 1, 1)))
                .SetTitle("CO2e (kg)");
            chart.Plot(barData1, bottomAxis, leftAxis);

            // =========================
            // SERIES 2: CO2, NO2, CH4 — SECONDARY (right) axis
            // =========================
            var barData2 = chart.ChartDataFactory.CreateBarChartData<string, double>();
            barData2.AddSeries(x,
                DataSources.FromNumericCellRange(sheet, new CellRangeAddress(1, rowCount, 2, 2)))
                .SetTitle("CO2 (kg)");
            barData2.AddSeries(x,
                DataSources.FromNumericCellRange(sheet, new CellRangeAddress(1, rowCount, 3, 3)))
                .SetTitle("NO2 (kg)");
            barData2.AddSeries(x,
                DataSources.FromNumericCellRange(sheet, new CellRangeAddress(1, rowCount, 4, 4)))
                .SetTitle("CH4 (kg)");
            chart.Plot(barData2, bottomAxis, rightAxis);

            // =========================
            // BAR CHART SETTINGS — BOTH CHARTS
            // =========================
            var ctChart = chart.GetCTChart();

            foreach (var barChart in ctChart.plotArea.barChart)
            {
                barChart.barDir = new CT_BarDir { val = ST_BarDir.col };
                barChart.grouping = new CT_BarGrouping { val = ST_BarGrouping.stacked };
                barChart.overlap = new CT_Overlap { val = 100 };
                barChart.gapWidth = new CT_GapAmount { val = 500 };
            }

            // =========================
            // FIX: DUAL AXIS CROSS LINKING
            // =========================
            var plotArea = ctChart.plotArea;

            // ✅ uint use karo — ulong nahi
            uint leftAxisId = plotArea.valAx[0].axId.val;
            uint rightAxisId = plotArea.valAx[1].axId.val;

            // Left axis — right axis ko cross kare
            plotArea.valAx[0].crossAx.val = rightAxisId;

            // Right axis — left axis ko cross kare
            plotArea.valAx[1].crossAx.val = leftAxisId;

            // Category axis fix
            plotArea.catAx[0].crosses = new CT_Crosses { val = ST_Crosses.autoZero };

            // crossBetween fix — bars Y-axis se door
            plotArea.valAx[0].crossBetween = new CT_CrossBetween { val = ST_CrossBetween.between };
            plotArea.valAx[1].crossBetween = new CT_CrossBetween { val = ST_CrossBetween.between };

            // ✅ Right axis visible rakho — 1 = false (NPOI mein CT_Boolean 1/0 use karta hai)
            plotArea.valAx[1].delete = new CT_Boolean { val = 1 };
            plotArea.valAx[1].delete = null; // sabse safe — delete tag hi mat daalo

            // =========================
            // SAVE TO MEMORY STREAM
            // =========================
            using var ms = new MemoryStream();
            wb.Write(ms);
            return ms.ToArray();
        }

        //    public static async Task<byte[]> ExportVehicleCategoryComboChartAsync(
        //List<string> categories,
        //List<double> distanceValues,
        //List<double> emissionValues,
        //string sheetName = "Category Report",
        //string chartTitle = "Vehicle Category Wise Distance & Emission")
        //    {
        //        if (categories == null || !categories.Any())
        //            return Array.Empty<byte>();

        //        var workbook = new XSSFWorkbook();
        //        var sheet = workbook.CreateSheet(sheetName);

        //        // =============================================
        //        // 1️⃣ HEADERS
        //        // =============================================
        //        var headerRow = sheet.CreateRow(0);
        //        headerRow.CreateCell(0).SetCellValue("Vehicle Category");
        //        headerRow.CreateCell(1).SetCellValue("Distance (km)");
        //        headerRow.CreateCell(2).SetCellValue("Emission (kg CO2e)");

        //        // =============================================
        //        // 2️⃣ DATA ROWS
        //        // =============================================
        //        for (int i = 0; i < categories.Count; i++)
        //        {
        //            var row = sheet.CreateRow(i + 1);
        //            row.CreateCell(0).SetCellValue(categories[i]);
        //            row.CreateCell(1).SetCellValue(distanceValues[i]);
        //            row.CreateCell(2).SetCellValue(emissionValues[i]);
        //        }

        //        int rowCount = categories.Count;

        //        // =============================================
        //        // 3️⃣ CHART SETUP
        //        // =============================================
        //        var drawing = sheet.CreateDrawingPatriarch();
        //        var anchor = drawing.CreateAnchor(0, 0, 0, 0, 4, 1, 18, 22);
        //        var chart = (XSSFChart)drawing.CreateChart(anchor);

        //        chart.SetTitle(chartTitle);
        //        chart.GetOrCreateLegend().Position = LegendPosition.Bottom;

        //        var xRange = DataSources.FromStringCellRange(
        //            sheet, new CellRangeAddress(1, rowCount, 0, 0));

        //        var distRange = DataSources.FromNumericCellRange(
        //            sheet, new CellRangeAddress(1, rowCount, 1, 1));

        //        var emitRange = DataSources.FromNumericCellRange(
        //            sheet, new CellRangeAddress(1, rowCount, 2, 2));

        //        // ── PRIMARY axis (Left) — Distance Bar ──
        //        var bottomAxis = chart.CreateCategoryAxis(AxisPosition.Bottom);
        //        var leftAxis = chart.CreateValueAxis(AxisPosition.Left);

        //        // ── SECONDARY axis (Right) — Emission Line ──
        //        var rightAxis = chart.CreateValueAxis(AxisPosition.Right);

        //        // =============================================
        //        // 4️⃣ BAR CHART — Distance (Primary/Left axis)
        //        // =============================================
        //        var barData = chart.ChartDataFactory.CreateBarChartData<string, double>();
        //        barData.AddSeries(xRange, distRange).SetTitle("Distance (km)");
        //        chart.Plot(barData, bottomAxis, leftAxis);

        //        // =============================================
        //        // 5️⃣ LINE CHART — Emission (Secondary/Right axis)
        //        // =============================================
        //        var lineData = chart.ChartDataFactory.CreateLineChartData<string, double>();
        //        lineData.AddSeries(xRange, emitRange).SetTitle("Emission (kg CO2e)");
        //        chart.Plot(lineData, bottomAxis, rightAxis);

        //        // =============================================
        //        // 6️⃣ CT LEVEL FIXES
        //        // =============================================
        //        var ctChart = chart.GetCTChart();
        //        var plotArea = ctChart.plotArea;

        //        // ── Bar: Clustered + Wide bars ──
        //        if (plotArea.barChart?.Count > 0)
        //        {
        //            var bc = plotArea.barChart[0];
        //            bc.barDir = new CT_BarDir { val = ST_BarDir.col };
        //            bc.grouping = new CT_BarGrouping { val = ST_BarGrouping.clustered };
        //            bc.overlap = new CT_Overlap { val = 0 };
        //            bc.gapWidth = new CT_GapAmount { val = 80 }; // wide bars
        //        }

        //        // ── Line: Dashed style + Circle markers (UI jaisa) ──
        //        if (plotArea.lineChart?.Count > 0)
        //        {
        //            foreach (var ser in plotArea.lineChart[0].ser)
        //            {
        //                // Circle marker
        //                ser.marker ??= new CT_Marker();
        //                ser.marker.symbol = new CT_MarkerStyle { val = ST_MarkerStyle.circle };
        //                ser.marker.size = new CT_MarkerSize { val = 6 };

        //                // Dashed line (UI mein dashed green line dikhta hai)
        //                ser.spPr ??= new NPOI.OpenXmlFormats.Dml.Chart.CT_ShapeProperties();
        //                ser.spPr.ln ??= new NPOI.OpenXmlFormats.Dml.CT_LineProperties();
        //                ser.spPr.ln.prstDash = new NPOI.OpenXmlFormats.Dml.CT_PresetLineDashProperties
        //                {
        //                    val = NPOI.OpenXmlFormats.Dml.ST_PresetLineDashVal.dash
        //                };
        //            }
        //        }

        //        // ── Dual axis cross-linking ──
        //        if (plotArea.valAx?.Count >= 2)
        //        {
        //            uint leftId = plotArea.valAx[0].axId.val;
        //            uint rightId = plotArea.valAx[1].axId.val;

        //            plotArea.valAx[0].crossAx.val = rightId;
        //            plotArea.valAx[1].crossAx.val = leftId;

        //            // Right axis visible rakho
        //            plotArea.valAx[1].delete = null;

        //            // crossBetween fix — bars category ke beech properly align hon
        //            plotArea.valAx[0].crossBetween = new CT_CrossBetween { val = ST_CrossBetween.between };
        //            plotArea.valAx[1].crossBetween = new CT_CrossBetween { val = ST_CrossBetween.between };

        //            // Right axis label — "Emission (kg CO2e)"
        //            plotArea.valAx[1].crosses = new CT_Crosses { val = ST_Crosses.max };
        //        }

        //        // ── Category axis fix ──
        //        if (plotArea.catAx?.Count > 0)
        //        {
        //            plotArea.catAx[0].crosses = new CT_Crosses { val = ST_Crosses.autoZero };
        //        }

        //        // =============================================
        //        // 7️⃣ COLUMN AUTO SIZE
        //        // =============================================
        //        sheet.AutoSizeColumn(0);
        //        sheet.AutoSizeColumn(1);
        //        sheet.AutoSizeColumn(2);

        //        using var stream = new MemoryStream();
        //        workbook.Write(stream);
        //        return stream.ToArray();
        //    }


        public static async Task<byte[]> ExportVehicleCategoryComboChartAsync(
    List<string> categories,
    List<double> distanceValues,
    List<double> emissionValues,
    string sheetName = "Category Report",
    string chartTitle = "Vehicle Category Wise Distance & Emission")
        {
            if (categories == null || !categories.Any())
                return Array.Empty<byte>();

            var categoryColors = new List<string> { "4472C4", "70AD47", "ED7D31", "D4537E", "534AB7" };

            var workbook = new XSSFWorkbook();
            var sheet = workbook.CreateSheet(sheetName);

            // ================= HEADER =================
            var headerRow = sheet.CreateRow(0);
            headerRow.CreateCell(0).SetCellValue("Vehicle Category");
            headerRow.CreateCell(1).SetCellValue("Distance (km)");
            headerRow.CreateCell(2).SetCellValue("Emission (kg CO2e)");

            // ================= DATA =================
            for (int i = 0; i < categories.Count; i++)
            {
                var row = sheet.CreateRow(i + 1);
                row.CreateCell(0).SetCellValue(categories[i]);
                row.CreateCell(1).SetCellValue(distanceValues[i]);
                row.CreateCell(2).SetCellValue(emissionValues[i]);
            }

            int rowCount = categories.Count;
            var drawing = sheet.CreateDrawingPatriarch();

            var xRange = DataSources.FromStringCellRange(sheet, new CellRangeAddress(1, rowCount, 0, 0));
            var distRange = DataSources.FromNumericCellRange(sheet, new CellRangeAddress(1, rowCount, 1, 1));
            var emitRange = DataSources.FromNumericCellRange(sheet, new CellRangeAddress(1, rowCount, 2, 2));

            // =========================================================
            // 📊 1️⃣ BAR CHART
            // =========================================================
            var anchorBar = drawing.CreateAnchor(0, 0, 0, 0, 4, 1, 18, 26);
            var barChart = (XSSFChart)drawing.CreateChart(anchorBar);

            barChart.SetTitle("Distance (km)");
            barChart.GetOrCreateLegend().Position = LegendPosition.Bottom;

            var barBottomAxis = barChart.CreateCategoryAxis(AxisPosition.Bottom);
            var barLeftAxis = barChart.CreateValueAxis(AxisPosition.Left);

            var barData = barChart.ChartDataFactory.CreateBarChartData<string, double>();
            barData.AddSeries(xRange, distRange).SetTitle("Distance (km)");
            barChart.Plot(barData, barBottomAxis, barLeftAxis);

            var barCT = barChart.GetCTChart();
            var barPA = barCT.plotArea;

            // Bar Gap Fix
            if (barPA.valAx?.Count > 0)
                barPA.valAx[0].crossBetween = new CT_CrossBetween { val = ST_CrossBetween.between };

            // Bar Style
            if (barPA.barChart?.Count > 0)
            {
                var bc = barPA.barChart[0];
                bc.barDir = new CT_BarDir { val = ST_BarDir.col };
                bc.grouping = new CT_BarGrouping { val = ST_BarGrouping.clustered };
                bc.gapWidth = new CT_GapAmount { val = 80 };

                if (bc.ser?.Count > 0)
                {
                    var ser = bc.ser[0];
                    ser.dPt = new List<CT_DPt>();
                    for (int i = 0; i < categories.Count; i++)
                    {
                        var dpt = new CT_DPt { idx = new CT_UnsignedInt { val = (uint)i } };
                        dpt.spPr = new NPOI.OpenXmlFormats.Dml.Chart.CT_ShapeProperties();
                        dpt.spPr.solidFill = new NPOI.OpenXmlFormats.Dml.CT_SolidColorFillProperties
                        {
                            srgbClr = new NPOI.OpenXmlFormats.Dml.CT_SRgbColor { val = HexStringToByteArray(categoryColors[i % categoryColors.Count]) }
                        };
                        ser.dPt.Add(dpt);
                    }
                }
            }

            // =========================================================
            // 📈 2️⃣ LINE CHART (With Overlap Fixes)
            // =========================================================
            var anchorLine = drawing.CreateAnchor(0, 0, 0, 0, 4, 30, 18, 50);
            var lineChart = (XSSFChart)drawing.CreateChart(anchorLine);

            lineChart.SetTitle("Emission (kg CO2e)");
            lineChart.GetOrCreateLegend().Position = LegendPosition.Bottom;

            var lineBottomAxis = lineChart.CreateCategoryAxis(AxisPosition.Bottom);
            var lineLeftAxis = lineChart.CreateValueAxis(AxisPosition.Left);

            // Padding at Top to avoid Title Overlap
            double maxVal = emissionValues.Any() ? emissionValues.Max() : 0;
            lineLeftAxis.Maximum = maxVal + (maxVal * 0.20);

            var lineData = lineChart.ChartDataFactory.CreateLineChartData<string, double>();
            lineData.AddSeries(xRange, emitRange).SetTitle("Emission");
            lineChart.Plot(lineData, lineBottomAxis, lineLeftAxis);

            var lineCT = lineChart.GetCTChart();
            var linePA = lineCT.plotArea;

            // ✅ FIX 1: Plot Area ko Right side shift karna (Y-Axis Numbers ke liye jagah)
            if (linePA.layout == null) linePA.layout = new CT_Layout();
            linePA.layout.manualLayout = new CT_ManualLayout
            {
                x = new CT_Double { val = 0.15 },    // 15% Right Shift
                w = new CT_Double { val = 0.75 },    // Width adjust taaki right side na kategi
                xMode = new CT_LayoutMode { val = ST_LayoutMode.edge },
                wMode = new CT_LayoutMode { val = ST_LayoutMode.edge }
            };

            if (linePA.lineChart?.Count > 0)
            {
                var lc = linePA.lineChart[0];
                foreach (var ser in lc.ser)
                {
                    // Line Styling
                    ser.spPr = new NPOI.OpenXmlFormats.Dml.Chart.CT_ShapeProperties();
                    ser.spPr.ln = new NPOI.OpenXmlFormats.Dml.CT_LineProperties
                    {
                        w = 28575,
                        prstDash = new CT_PresetLineDashProperties { val = ST_PresetLineDashVal.dash }
                    };
                    ser.marker = new CT_Marker { symbol = new CT_MarkerStyle { val = ST_MarkerStyle.circle } };

                    // ✅ FIX 2 & 3: Data Labels position and overlap avoidance
                    // ✅ FIX 2 & 3: Data Labels position and overlap avoidance
                    ser.dLbls = new CT_DLbls();
                    ser.dLbls.showVal = new CT_Boolean { val = 1 };
                    ser.dLbls.showSerName = new CT_Boolean { val = 0 };
                    ser.dLbls.showCatName = new CT_Boolean { val = 0 };
                    ser.dLbls.dLblPos = new CT_DLblPos { val = ST_DLblPos.r }; // Position Right

                    // Overlap ko allow mat karo (Excel version dependent, but good to have)
                    ser.dLbls.showLeaderLines = new CT_Boolean { val = 1 };

                    // 'delete' error fix: 
                    // NPOI mein 'delete' property aksar directly assignable nahi hoti list ki tarah.
                    // Isko as-is chhod dein ya individual labels (dLbl) ke liye use karein.
                    // Filhal, overlapping hatane ke liye dLblPos kafi hai.
                    //ser.dLbls = new CT_DLbls();
                    //ser.dLbls.showVal = new CT_Boolean { val = 1 };
                    //ser.dLbls.showSerName = new CT_Boolean { val = 0 };
                    //ser.dLbls.showCatName = new CT_Boolean { val = 0 };
                    //ser.dLbls.dLblPos = new CT_DLblPos { val = ST_DLblPos.r }; // Position Right
                    //ser.dLbls.delete = new List<CT_Boolean>();
                }
            }

            // ✅ FIX 4: Axis Numbers Tick Position
            if (linePA.valAx?.Count > 0)
            {
                linePA.valAx[0].tickLblPos = new CT_TickLblPos { val = ST_TickLblPos.nextTo };
                linePA.valAx[0].crossBetween = new CT_CrossBetween { val = ST_CrossBetween.between };
            }

            // ================= COLUMN WIDTH =================
            sheet.SetColumnWidth(0, 22 * 256);
            sheet.SetColumnWidth(1, 18 * 256);
            sheet.SetColumnWidth(2, 22 * 256);

            using var stream = new MemoryStream();
            workbook.Write(stream);
            return stream.ToArray();
        }


        //    public static async Task<byte[]> ExportVehicleCategoryComboChartAsync(
        //List<string> categories,
        //List<double> distanceValues,
        //List<double> emissionValues,
        //string sheetName = "Category Report",
        //string chartTitle = "Vehicle Category Wise Distance & Emission")
        //    {
        //        if (categories == null || !categories.Any())
        //            return Array.Empty<byte>();

        //        var categoryColors = new List<string>
        //{
        //    "4472C4",
        //    "70AD47",
        //    "ED7D31",
        //    "D4537E",
        //    "534AB7",
        //};

        //        var workbook = new XSSFWorkbook();
        //        var sheet = workbook.CreateSheet(sheetName);

        //        // ================= HEADER =================
        //        var headerRow = sheet.CreateRow(0);
        //        headerRow.CreateCell(0).SetCellValue("Vehicle Category");
        //        headerRow.CreateCell(1).SetCellValue("Distance (km)");
        //        headerRow.CreateCell(2).SetCellValue("Emission (kg CO2e)");

        //        // ================= DATA =================
        //        for (int i = 0; i < categories.Count; i++)
        //        {
        //            var row = sheet.CreateRow(i + 1);
        //            row.CreateCell(0).SetCellValue(categories[i]);
        //            row.CreateCell(1).SetCellValue(distanceValues[i]);
        //            row.CreateCell(2).SetCellValue(emissionValues[i]);
        //        }

        //        int rowCount = categories.Count;

        //        var drawing = sheet.CreateDrawingPatriarch();

        //        var xRange = DataSources.FromStringCellRange(sheet, new CellRangeAddress(1, rowCount, 0, 0));
        //        var distRange = DataSources.FromNumericCellRange(sheet, new CellRangeAddress(1, rowCount, 1, 1));
        //        var emitRange = DataSources.FromNumericCellRange(sheet, new CellRangeAddress(1, rowCount, 2, 2));

        //        // =========================================================
        //        // 📊 1️⃣ BAR CHART
        //        // =========================================================
        //        var anchorBar = drawing.CreateAnchor(0, 0, 0, 0, 4, 1, 18, 15);
        //        var barChart = (XSSFChart)drawing.CreateChart(anchorBar);

        //        barChart.SetTitle("Distance (km)");
        //        barChart.GetOrCreateLegend().Position = LegendPosition.Bottom;

        //        var barBottomAxis = barChart.CreateCategoryAxis(AxisPosition.Bottom);
        //        var barLeftAxis = barChart.CreateValueAxis(AxisPosition.Left);

        //        var barData = barChart.ChartDataFactory.CreateBarChartData<string, double>();
        //        barData.AddSeries(xRange, distRange).SetTitle("Distance (km)");
        //        barChart.Plot(barData, barBottomAxis, barLeftAxis);

        //        // 🔥 BAR FIRST GAP FIX
        //        var barCTFix = barChart.GetCTChart();
        //        var barPlotFix = barCTFix.plotArea;

        //        if (barPlotFix.valAx?.Count > 0)
        //        {
        //            barPlotFix.valAx[0].crossBetween = new CT_CrossBetween
        //            {
        //                val = ST_CrossBetween.between
        //            };
        //        }

        //        // 🎨 BAR STYLE
        //        var barCT = barChart.GetCTChart();
        //        var barPA = barCT.plotArea;

        //        if (barPA.barChart?.Count > 0)
        //        {
        //            var bc = barPA.barChart[0];
        //            bc.barDir = new CT_BarDir { val = ST_BarDir.col };
        //            bc.grouping = new CT_BarGrouping { val = ST_BarGrouping.clustered };
        //            bc.gapWidth = new CT_GapAmount { val = 80 };

        //            if (bc.ser?.Count > 0)
        //            {
        //                var ser = bc.ser[0];
        //                ser.dPt = new List<CT_DPt>();

        //                for (int i = 0; i < categories.Count; i++)
        //                {
        //                    string hex = categoryColors[i % categoryColors.Count];

        //                    var dpt = new CT_DPt();
        //                    dpt.idx = new CT_UnsignedInt { val = (uint)i };

        //                    dpt.spPr = new NPOI.OpenXmlFormats.Dml.Chart.CT_ShapeProperties();
        //                    dpt.spPr.solidFill = new NPOI.OpenXmlFormats.Dml.CT_SolidColorFillProperties();
        //                    dpt.spPr.solidFill.srgbClr = new NPOI.OpenXmlFormats.Dml.CT_SRgbColor
        //                    {
        //                        val = HexStringToByteArray(hex)
        //                    };

        //                    ser.dPt.Add(dpt);
        //                }
        //            }
        //        }

        //        // =========================================================
        //        // 📈 2️⃣ LINE CHART
        //        // =========================================================
        //        // ... (existing code for data and bar chart)

        //        // =========================================================
        //        // 📈 2️⃣ LINE CHART
        //        // =========================================================
        //        var anchorLine = drawing.CreateAnchor(0, 0, 0, 0, 4, 16, 18, 30);
        //        var lineChart = (XSSFChart)drawing.CreateChart(anchorLine);

        //        lineChart.SetTitle("Emission (kg CO2e)");
        //        lineChart.GetOrCreateLegend().Position = LegendPosition.Bottom;

        //        var lineBottomAxis = lineChart.CreateCategoryAxis(AxisPosition.Bottom);
        //        var lineLeftAxis = lineChart.CreateValueAxis(AxisPosition.Left);

        //        // ✅ FIX 1: Axis ke upar extra jagah chhodne ke liye Scale set karein
        //        // Agar aapka max data 19000 hai, to hum axis ko 22000 tak le jayenge
        //        double maxVal = emissionValues.Max();
        //        lineLeftAxis.Maximum = maxVal + (maxVal * 0.15); // 15% extra space at top

        //        var lineData = lineChart.ChartDataFactory.CreateLineChartData<string, double>();
        //        lineData.AddSeries(xRange, emitRange).SetTitle("Emission");
        //        lineChart.Plot(lineData, lineBottomAxis, lineLeftAxis);

        //        // ... (existing gap fix code)

        //        // 🎨 LINE STYLE + DATA LABELS
        //        var lineCT = lineChart.GetCTChart();
        //        var linePA = lineCT.plotArea;

        //        if (linePA.lineChart?.Count > 0)
        //        {
        //            var lc = linePA.lineChart[0];

        //            foreach (var ser in lc.ser)
        //            {
        //                // ... (existing line styling code)
        //                ser.spPr = new NPOI.OpenXmlFormats.Dml.Chart.CT_ShapeProperties();
        //                ser.spPr.ln = new NPOI.OpenXmlFormats.Dml.CT_LineProperties();
        //                ser.spPr.ln.prstDash = new NPOI.OpenXmlFormats.Dml.CT_PresetLineDashProperties { val = NPOI.OpenXmlFormats.Dml.ST_PresetLineDashVal.dash };
        //                ser.marker = new CT_Marker { symbol = new CT_MarkerStyle { val = ST_MarkerStyle.circle } };

        //                // ✅ FIX 2: DATA LABELS positioning and content
        //                ser.dLbls = new CT_DLbls();
        //                ser.dLbls.showVal = new CT_Boolean { val = 1 };     // Value dikhao
        //                ser.dLbls.showSerName = new CT_Boolean { val = 0 }; // Series name band karo (Overlap kam hoga)
        //                ser.dLbls.showCatName = new CT_Boolean { val = 0 }; // Category name band karo

        //                // Labels ko point ke "Below" (neeche) set karein taaki title se na takraye
        //                ser.dLbls.dLblPos = new CT_DLblPos { val = ST_DLblPos.b };
        //            }
        //        }
        //        //var anchorLine = drawing.CreateAnchor(0, 0, 0, 0, 4, 16, 18, 30);
        //        //var lineChart = (XSSFChart)drawing.CreateChart(anchorLine);

        //        //lineChart.SetTitle("Emission (kg CO2e)");
        //        //lineChart.GetOrCreateLegend().Position = LegendPosition.Bottom;

        //        //var lineBottomAxis = lineChart.CreateCategoryAxis(AxisPosition.Bottom);
        //        //var lineLeftAxis = lineChart.CreateValueAxis(AxisPosition.Left);

        //        //var lineData = lineChart.ChartDataFactory.CreateLineChartData<string, double>();
        //        //lineData.AddSeries(xRange, emitRange).SetTitle("Emission");
        //        //lineChart.Plot(lineData, lineBottomAxis, lineLeftAxis);

        //        //// 🔥 LINE FIRST POINT GAP FIX
        //        //var lineCTFix = lineChart.GetCTChart();
        //        //var linePlotFix = lineCTFix.plotArea;

        //        //if (linePlotFix.valAx?.Count > 0)
        //        //{
        //        //    linePlotFix.valAx[0].crossBetween = new CT_CrossBetween
        //        //    {
        //        //        val = ST_CrossBetween.between
        //        //    };
        //        //}

        //        //// 🎨 LINE STYLE + DATA LABELS
        //        //var lineCT = lineChart.GetCTChart();
        //        //var linePA = lineCT.plotArea;

        //        //if (linePA.lineChart?.Count > 0)
        //        //{
        //        //    var lc = linePA.lineChart[0];

        //        //    foreach (var ser in lc.ser)
        //        //    {
        //        //        ser.spPr = new NPOI.OpenXmlFormats.Dml.Chart.CT_ShapeProperties();
        //        //        ser.spPr.ln = new NPOI.OpenXmlFormats.Dml.CT_LineProperties();

        //        //        ser.spPr.ln.prstDash = new NPOI.OpenXmlFormats.Dml.CT_PresetLineDashProperties
        //        //        {
        //        //            val = NPOI.OpenXmlFormats.Dml.ST_PresetLineDashVal.dash
        //        //        };

        //        //        ser.marker = new CT_Marker();
        //        //        ser.marker.symbol = new CT_MarkerStyle { val = ST_MarkerStyle.circle };

        //        //        // ✅ DATA LABELS
        //        //        ser.dLbls = new CT_DLbls();
        //        //        ser.dLbls.showVal = new CT_Boolean { val = 1 };
        //        //    }
        //        //}

        //        // ================= COLUMN WIDTH =================
        //        sheet.SetColumnWidth(0, 22 * 256);
        //        sheet.SetColumnWidth(1, 18 * 256);
        //        sheet.SetColumnWidth(2, 22 * 256);

        //        using var stream = new MemoryStream();
        //        workbook.Write(stream);
        //        return stream.ToArray();
        //    }

        //    public static async Task<byte[]> ExportVehicleCategoryComboChartAsync(
        //List<string> categories,
        //List<double> distanceValues,
        //List<double> emissionValues,
        //string sheetName = "Category Report",
        //string chartTitle = "Vehicle Category Wise Distance & Emission")
        //    {
        //        if (categories == null || !categories.Any())
        //            return Array.Empty<byte>();

        //        var categoryColors = new List<string>
        //{
        //    "4472C4",
        //    "70AD47",
        //    "ED7D31",
        //    "D4537E",
        //    "534AB7",
        //};

        //        var workbook = new XSSFWorkbook();
        //        var sheet = workbook.CreateSheet(sheetName);

        //        // ================= HEADER =================
        //        var headerFont = workbook.CreateFont();
        //        headerFont.IsBold = true;

        //        var headerStyle = workbook.CreateCellStyle();
        //        headerStyle.SetFont(headerFont);
        //        headerStyle.Alignment = HorizontalAlignment.Center;

        //        var headerRow = sheet.CreateRow(0);
        //        headerRow.CreateCell(0).SetCellValue("Vehicle Category");
        //        headerRow.CreateCell(1).SetCellValue("Distance (km)");
        //        headerRow.CreateCell(2).SetCellValue("Emission (kg CO2e)");

        //        // ================= DATA =================
        //        for (int i = 0; i < categories.Count; i++)
        //        {
        //            var row = sheet.CreateRow(i + 1);
        //            row.CreateCell(0).SetCellValue(categories[i]);
        //            row.CreateCell(1).SetCellValue(distanceValues[i]);
        //            row.CreateCell(2).SetCellValue(emissionValues[i]);
        //        }

        //        int rowCount = categories.Count;

        //        var drawing = sheet.CreateDrawingPatriarch();

        //        var xRange = DataSources.FromStringCellRange(sheet, new CellRangeAddress(1, rowCount, 0, 0));
        //        var distRange = DataSources.FromNumericCellRange(sheet, new CellRangeAddress(1, rowCount, 1, 1));
        //        var emitRange = DataSources.FromNumericCellRange(sheet, new CellRangeAddress(1, rowCount, 2, 2));

        //        // =========================================================
        //        // 📊 1️⃣ BAR CHART (TOP)
        //        // =========================================================
        //        var anchorBar = drawing.CreateAnchor(0, 0, 0, 0, 4, 1, 18, 15);
        //        var barChart = (XSSFChart)drawing.CreateChart(anchorBar);

        //        barChart.SetTitle("Distance (km)");
        //        barChart.GetOrCreateLegend().Position = LegendPosition.Bottom;

        //        var barBottomAxis = barChart.CreateCategoryAxis(AxisPosition.Bottom);
        //        var barLeftAxis = barChart.CreateValueAxis(AxisPosition.Left);

        //        var barData = barChart.ChartDataFactory.CreateBarChartData<string, double>();
        //        barData.AddSeries(xRange, distRange).SetTitle("Distance (km)");
        //        barChart.Plot(barData, barBottomAxis, barLeftAxis);

        //        // ✅ YAHI ADD KIYA
        //        var barCTFix = barChart.GetCTChart();
        //        var barPlotFix = barCTFix.plotArea;

        //        if (barPlotFix.valAx?.Count > 0)
        //        {
        //            barPlotFix.valAx[0].crossBetween = new CT_CrossBetween
        //            {
        //                val = ST_CrossBetween.between
        //            };
        //        }

        //        // 🎨 BAR STYLING
        //        var barCT = barChart.GetCTChart();
        //        var barPA = barCT.plotArea;

        //        if (barPA.barChart?.Count > 0)
        //        {
        //            var bc = barPA.barChart[0];
        //            bc.barDir = new CT_BarDir { val = ST_BarDir.col };
        //            bc.grouping = new CT_BarGrouping { val = ST_BarGrouping.clustered };
        //            bc.gapWidth = new CT_GapAmount { val = 80 };

        //            if (bc.ser?.Count > 0)
        //            {
        //                var ser = bc.ser[0];
        //                ser.dPt = new List<CT_DPt>();

        //                for (int i = 0; i < categories.Count; i++)
        //                {
        //                    string hex = categoryColors[i % categoryColors.Count];

        //                    var dpt = new CT_DPt();
        //                    dpt.idx = new CT_UnsignedInt { val = (uint)i };

        //                    dpt.spPr = new NPOI.OpenXmlFormats.Dml.Chart.CT_ShapeProperties();
        //                    dpt.spPr.solidFill = new NPOI.OpenXmlFormats.Dml.CT_SolidColorFillProperties();
        //                    dpt.spPr.solidFill.srgbClr = new NPOI.OpenXmlFormats.Dml.CT_SRgbColor
        //                    {
        //                        val = HexStringToByteArray(hex)
        //                    };

        //                    ser.dPt.Add(dpt);
        //                }
        //            }
        //        }

        //        // =========================================================
        //        // 📈 2️⃣ LINE CHART (BOTTOM)
        //        // =========================================================
        //        var anchorLine = drawing.CreateAnchor(0, 0, 0, 0, 4, 16, 18, 30);
        //        var lineChart = (XSSFChart)drawing.CreateChart(anchorLine);

        //        lineChart.SetTitle("Emission (kg CO2e)");
        //        lineChart.GetOrCreateLegend().Position = LegendPosition.Bottom;

        //        var lineBottomAxis = lineChart.CreateCategoryAxis(AxisPosition.Bottom);
        //        var lineLeftAxis = lineChart.CreateValueAxis(AxisPosition.Left);

        //        var lineData = lineChart.ChartDataFactory.CreateLineChartData<string, double>();
        //        lineData.AddSeries(xRange, emitRange).SetTitle("Emission");
        //        lineChart.Plot(lineData, lineBottomAxis, lineLeftAxis);

        //        // 🎨 LINE STYLING + DATA LABELS
        //        var lineCT = lineChart.GetCTChart();
        //        var linePA = lineCT.plotArea;

        //        if (linePA.lineChart?.Count > 0)
        //        {
        //            var lc = linePA.lineChart[0];

        //            foreach (var ser in lc.ser)
        //            {
        //                // dashed line
        //                ser.spPr = new NPOI.OpenXmlFormats.Dml.Chart.CT_ShapeProperties();
        //                ser.spPr.ln = new NPOI.OpenXmlFormats.Dml.CT_LineProperties();
        //                ser.spPr.ln.prstDash = new NPOI.OpenXmlFormats.Dml.CT_PresetLineDashProperties
        //                {
        //                    val = NPOI.OpenXmlFormats.Dml.ST_PresetLineDashVal.dash
        //                };

        //                // marker
        //                ser.marker = new CT_Marker();
        //                ser.marker.symbol = new CT_MarkerStyle { val = ST_MarkerStyle.circle };

        //                // ✅ DATA LABELS SHOW
        //                ser.dLbls = new CT_DLbls();
        //                ser.dLbls.showVal = new CT_Boolean { val = 1 }; // 🔥 value visible
        //            }
        //        }

        //        // ================= COLUMN WIDTH =================
        //        sheet.SetColumnWidth(0, 22 * 256);
        //        sheet.SetColumnWidth(1, 18 * 256);
        //        sheet.SetColumnWidth(2, 22 * 256);

        //        using var stream = new MemoryStream();
        //        workbook.Write(stream);
        //        return stream.ToArray();
        //    }

        //        public static async Task<byte[]> ExportVehicleCategoryComboChartAsync(
        //    List<string> categories,
        //    List<double> distanceValues,
        //    List<double> emissionValues,
        //    string sheetName = "Category Report",
        //    string chartTitle = "Vehicle Category Wise Distance & Emission")
        //{
        //    if (categories == null || !categories.Any())
        //        return Array.Empty<byte>();

        //    // =============================================
        //    // UI Chart ke same colors (LDV=Blue, MDV=Green, HDV=Orange)
        //    // =============================================
        //    var categoryColors = new List<string>
        //    {
        //        "4472C4", // Blue  — LDV
        //        "70AD47", // Green — MDV
        //        "ED7D31", // Orange— HDV
        //        "D4537E", // Pink  — fallback
        //        "534AB7", // Purple— fallback
        //    };

        //    var workbook = new XSSFWorkbook();
        //    var sheet    = workbook.CreateSheet(sheetName);

        //    // =============================================
        //    // 1️⃣ HEADERS — Bold style
        //    // =============================================
        //    var headerFont  = workbook.CreateFont();
        //    headerFont.IsBold = true;
        //    headerFont.FontHeightInPoints = 11;

        //    var headerStyle = workbook.CreateCellStyle();
        //    headerStyle.SetFont(headerFont);
        //    headerStyle.FillForegroundColor = IndexedColors.Grey25Percent.Index;
        //    headerStyle.FillPattern         = FillPattern.SolidForeground;
        //    headerStyle.Alignment           = HorizontalAlignment.Center;
        //    headerStyle.BorderBottom        = BorderStyle.Medium;
        //    headerStyle.BorderTop           = BorderStyle.Medium;
        //    headerStyle.BorderLeft          = BorderStyle.Medium;
        //    headerStyle.BorderRight         = BorderStyle.Medium;

        //    var headerRow = sheet.CreateRow(0);

        //    var h0 = headerRow.CreateCell(0); h0.SetCellValue("Vehicle Category"); h0.CellStyle = headerStyle;
        //    var h1 = headerRow.CreateCell(1); h1.SetCellValue("Distance (km)");    h1.CellStyle = headerStyle;
        //    var h2 = headerRow.CreateCell(2); h2.SetCellValue("Emission (kg CO2e)"); h2.CellStyle = headerStyle;

        //    // =============================================
        //    // 2️⃣ DATA ROWS — Styled
        //    // =============================================
        //    var dataFont  = workbook.CreateFont();
        //    dataFont.FontHeightInPoints = 11;

        //    var dataStyle  = workbook.CreateCellStyle();
        //    dataStyle.SetFont(dataFont);
        //    dataStyle.BorderBottom = BorderStyle.Thin;
        //    dataStyle.BorderTop    = BorderStyle.Thin;
        //    dataStyle.BorderLeft   = BorderStyle.Thin;
        //    dataStyle.BorderRight  = BorderStyle.Thin;
        //    dataStyle.Alignment    = HorizontalAlignment.Left;

        //    var numStyle   = workbook.CreateCellStyle();
        //    numStyle.SetFont(dataFont);
        //    numStyle.BorderBottom = BorderStyle.Thin;
        //    numStyle.BorderTop    = BorderStyle.Thin;
        //    numStyle.BorderLeft   = BorderStyle.Thin;
        //    numStyle.BorderRight  = BorderStyle.Thin;
        //    numStyle.Alignment    = HorizontalAlignment.Right;

        //    for (int i = 0; i < categories.Count; i++)
        //    {
        //        var row = sheet.CreateRow(i + 1);
        //        row.HeightInPoints = 18;

        //        var c0 = row.CreateCell(0); c0.SetCellValue(categories[i]);     c0.CellStyle = dataStyle;
        //        var c1 = row.CreateCell(1); c1.SetCellValue(distanceValues[i]); c1.CellStyle = numStyle;
        //        var c2 = row.CreateCell(2); c2.SetCellValue(emissionValues[i]); c2.CellStyle = numStyle;
        //    }

        //    int rowCount = categories.Count;

        //    // =============================================
        //    // 3️⃣ CHART SETUP
        //    // =============================================
        //    var drawing = sheet.CreateDrawingPatriarch();
        //    var anchor  = drawing.CreateAnchor(0, 0, 0, 0, 4, 1, 18, 22);
        //    var chart   = (XSSFChart)drawing.CreateChart(anchor);

        //    chart.SetTitle(chartTitle);
        //    chart.GetOrCreateLegend().Position = LegendPosition.Bottom;

        //    var xRange    = DataSources.FromStringCellRange(sheet,  new CellRangeAddress(1, rowCount, 0, 0));
        //    var distRange = DataSources.FromNumericCellRange(sheet, new CellRangeAddress(1, rowCount, 1, 1));
        //    var emitRange = DataSources.FromNumericCellRange(sheet, new CellRangeAddress(1, rowCount, 2, 2));

        //    // PRIMARY axis (Left)  → Distance Bar
        //    var bottomAxis = chart.CreateCategoryAxis(AxisPosition.Bottom);
        //    var leftAxis   = chart.CreateValueAxis(AxisPosition.Left);

        //    // SECONDARY axis (Right) → Emission Line
        //    //var rightAxis  = chart.CreateValueAxis(AxisPosition.Right);


        //    // =============================================
        //    // 4️⃣ BAR CHART — Distance (Left/Primary axis)
        //    // =============================================
        //    var barData = chart.ChartDataFactory.CreateBarChartData<string, double>();
        //    barData.AddSeries(xRange, distRange).SetTitle("Distance (km)");
        //    chart.Plot(barData, bottomAxis, leftAxis);

        //    // =============================================
        //    // 5️⃣ LINE CHART — Emission (Right/Secondary axis)
        //    // =============================================
        //    var lineData = chart.ChartDataFactory.CreateLineChartData<string, double>();
        //    lineData.AddSeries(xRange, emitRange).SetTitle("Emission (kg CO2e)");
        //    chart.Plot(lineData, bottomAxis, leftAxis);

        //    // =============================================
        //    // 6️⃣ CT LEVEL FIXES — Sab styling yahan hoti hai
        //    // =============================================
        //    var ctChart  = chart.GetCTChart();
        //    var plotArea = ctChart.plotArea;

        //    // ── BAR: Clustered + Per-Category Color ──────────────────────────────
        //    if (plotArea.barChart?.Count > 0)
        //    {
        //        var bc      = plotArea.barChart[0];
        //        bc.barDir   = new CT_BarDir     { val = ST_BarDir.col            };
        //        bc.grouping = new CT_BarGrouping { val = ST_BarGrouping.clustered };
        //        bc.overlap  = new CT_Overlap    { val = 0                        };
        //        bc.gapWidth = new CT_GapAmount  { val = 80 };  // wide bars

        //        // ✅ KEY FIX: Per-bar color — UI ke same (Blue, Green, Orange)
        //        if (bc.ser?.Count > 0)
        //        {
        //            var ser = bc.ser[0];  // single series
        //            ser.dPt = new List<CT_DPt>();

        //            for (int i = 0; i < categories.Count; i++)
        //            {
        //                string hex = i < categoryColors.Count ? categoryColors[i] : "888888";

        //                var dpt = new CT_DPt();
        //                dpt.idx      = new CT_UnsignedInt { val = (uint)i };
        //                dpt.bubble3D = new CT_Boolean { val = 0 };

        //                dpt.spPr = new NPOI.OpenXmlFormats.Dml.Chart.CT_ShapeProperties();

        //                // Fill color
        //                dpt.spPr.solidFill = new NPOI.OpenXmlFormats.Dml.CT_SolidColorFillProperties();
        //                dpt.spPr.solidFill.srgbClr = new NPOI.OpenXmlFormats.Dml.CT_SRgbColor
        //                {
        //                    val = HexStringToByteArray(hex)
        //                };

        //                // Border same color (clean look)
        //                dpt.spPr.ln = new NPOI.OpenXmlFormats.Dml.CT_LineProperties();
        //                dpt.spPr.ln.solidFill = new NPOI.OpenXmlFormats.Dml.CT_SolidColorFillProperties();
        //                dpt.spPr.ln.solidFill.srgbClr = new NPOI.OpenXmlFormats.Dml.CT_SRgbColor
        //                {
        //                    val = HexStringToByteArray(hex)
        //                };

        //                ser.dPt.Add(dpt);
        //            }
        //        }
        //    }

        //    // ── LINE: Dashed + Hollow Circle markers (UI jaisa) ──────────────────
        //    if (plotArea.lineChart?.Count > 0)
        //    {
        //        foreach (var ser in plotArea.lineChart[0].ser)
        //        {
        //            // ✅ Circle marker — hollow style
        //            ser.marker ??= new CT_Marker();
        //            ser.marker.symbol = new CT_MarkerStyle { val = ST_MarkerStyle.circle };
        //            ser.marker.size   = new CT_MarkerSize  { val = 6 };

        //            // Hollow marker — white fill + colored border
        //            ser.marker.spPr = new NPOI.OpenXmlFormats.Dml.Chart.CT_ShapeProperties();

        //            // White fill (hollow look)
        //            ser.marker.spPr.solidFill = new NPOI.OpenXmlFormats.Dml.CT_SolidColorFillProperties();
        //            ser.marker.spPr.solidFill.srgbClr = new NPOI.OpenXmlFormats.Dml.CT_SRgbColor
        //            {
        //                val = HexStringToByteArray("FFFFFF")  // white fill = hollow look
        //            };

        //            // Line color (dashed orange — UI match)
        //            ser.spPr ??= new NPOI.OpenXmlFormats.Dml.Chart.CT_ShapeProperties();
        //            ser.spPr.ln ??= new NPOI.OpenXmlFormats.Dml.CT_LineProperties();

        //            // ✅ Dashed line style
        //            ser.spPr.ln.prstDash = new NPOI.OpenXmlFormats.Dml.CT_PresetLineDashProperties
        //            {
        //                val = NPOI.OpenXmlFormats.Dml.ST_PresetLineDashVal.dash
        //            };

        //            // ✅ Line color = green (UI chart mein dashed green hai)
        //            ser.spPr.ln.solidFill = new NPOI.OpenXmlFormats.Dml.CT_SolidColorFillProperties();
        //            ser.spPr.ln.solidFill.srgbClr = new NPOI.OpenXmlFormats.Dml.CT_SRgbColor
        //            {
        //                val = HexStringToByteArray("1D9E75")  // Green — UI match
        //            };

        //            // Marker border color same as line
        //            ser.marker.spPr.ln = new NPOI.OpenXmlFormats.Dml.CT_LineProperties();
        //            ser.marker.spPr.ln.solidFill = new NPOI.OpenXmlFormats.Dml.CT_SolidColorFillProperties();
        //            ser.marker.spPr.ln.solidFill.srgbClr = new NPOI.OpenXmlFormats.Dml.CT_SRgbColor
        //            {
        //                val = HexStringToByteArray("1D9E75")
        //            };
        //        }
        //    }

        //    // ── DUAL AXIS: Cross-linking ──────────────────────────────────────────
        //    if (plotArea.valAx?.Count >= 2)
        //    {
        //        uint leftId  = plotArea.valAx[0].axId.val;
        //        uint rightId = plotArea.valAx[1].axId.val;

        //        // Cross-link both axes
        //        plotArea.valAx[0].crossAx.val = rightId;
        //        plotArea.valAx[1].crossAx.val = leftId;

        //        // ✅ Right axis — VISIBLE rakho (delete tag null = visible)
        //        plotArea.valAx[1].delete = null;

        //        // ✅ Right axis position: max (Y-axis right side pe)
        //        plotArea.valAx[1].axPos = new CT_AxPos { val = ST_AxPos.r };

        //        // ✅ Right axis crosses at max of LEFT axis (so it appears on right)
        //        plotArea.valAx[1].crosses = new CT_Crosses { val = ST_Crosses.max };
        //        plotArea.valAx[1].crossesAt = null;

        //        // crossBetween fix — bars Y-axis ke beech properly render
        //        plotArea.valAx[0].crossBetween = new CT_CrossBetween { val = ST_CrossBetween.between };
        //        plotArea.valAx[1].crossBetween = new CT_CrossBetween { val = ST_CrossBetween.between };

        //        // Left axis scale
        //        double maxDist = distanceValues.Any() ? distanceValues.Max() : 100;
        //        double leftMax = Math.Ceiling(maxDist / 2000) * 2000;

        //        plotArea.valAx[0].scaling = new CT_Scaling
        //        {
        //            orientation = new CT_Orientation { val = ST_Orientation.minMax },
        //            min = new CT_Double { val = -2000 },
        //            //min = new CT_Double { val = 0 },
        //            max = new CT_Double { val = leftMax }
        //        };

        //        // Right axis scale — emission values ke basis pe
        //        double maxEmit = emissionValues.Any() ? emissionValues.Max() : 100;
        //        double rightMax = Math.Ceiling(maxEmit / 5000) * 5000;

        //        plotArea.valAx[1].scaling = new CT_Scaling
        //        {
        //            orientation = new CT_Orientation { val = ST_Orientation.minMax },
        //            min = new CT_Double { val = 0 },
        //            max = new CT_Double { val = rightMax }
        //        };
        //    }

        //    // ── CATEGORY AXIS fix ─────────────────────────────────────────────────
        //    if (plotArea.catAx?.Count > 0)
        //    {
        //        plotArea.catAx[0].crosses    = new CT_Crosses { val = ST_Crosses.autoZero };
        //        plotArea.catAx[0].crossesAt  = null;
        //        plotArea.catAx[0].axPos      = new CT_AxPos      { val = ST_AxPos.b           };
        //        plotArea.catAx[0].tickLblPos = new CT_TickLblPos { val = ST_TickLblPos.nextTo };
        //    }

        //    // =============================================
        //    // 7️⃣ COLUMN WIDTHS
        //    // =============================================
        //    sheet.SetColumnWidth(0, 22 * 256);  // Vehicle Category
        //    sheet.SetColumnWidth(1, 18 * 256);  // Distance (km)
        //    sheet.SetColumnWidth(2, 22 * 256);  // Emission (kg CO2e)

        //    using var stream = new MemoryStream();
        //    workbook.Write(stream);
        //    return stream.ToArray();
        //}
    }
}