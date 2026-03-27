using ClosedXML.Excel;
using NPOI.OpenXmlFormats.Dml.Chart;
using NPOI.SS.UserModel;
using NPOI.SS.UserModel.Charts;
using NPOI.SS.Util;
using NPOI.XSSF.UserModel;
using NPOI.XSSF.UserModel.Charts;
using ProjectApp.Core.DTOs.Charts;
using System.Reflection;

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
            var anchor = drawing.CreateAnchor(0, 0, 0, 0, col + 1, 1, col + 12, 22);
            var chart = (XSSFChart)drawing.CreateChart(anchor);

            chart.SetTitle(chartTitle);
            chart.GetOrCreateLegend().Position = LegendPosition.Bottom;

            var bottomAxis = chart.CreateCategoryAxis(AxisPosition.Bottom);
            var leftAxis = chart.CreateValueAxis(AxisPosition.Left);

            // ❌ REMOVE THIS (important)
            // leftAxis.Minimum = 0;

            // ✅ FIX 1: ONLY mapped numeric columns
            var numericProps = columnMappings.Values.Skip(1).ToList();

            var values = data
                .SelectMany(x => numericProps.Select(p =>
                {
                    var prop = typeof(T).GetProperty(p);
                    return Convert.ToDouble(prop?.GetValue(x) ?? 0);
                }))
                .Where(v => v > 0)
                .DefaultIfEmpty(0)
                .ToList();

            double maxValue = values.Max();

            var dataFactory = chart.ChartDataFactory;
            var chartData = dataFactory.CreateBarChartData<string, double>();

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

            chart.Plot(chartData, bottomAxis, leftAxis);

            // ✅🔥 REAL FIX: FORCE Y-AXIS SCALE (NO AUTO BUG)
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

            // ✅ STACKED BAR FIX
            if (ctChart.plotArea.barChart != null && ctChart.plotArea.barChart.Count > 0)
            {
                var barChart = ctChart.plotArea.barChart[0];

                barChart.barDir = new NPOI.OpenXmlFormats.Dml.Chart.CT_BarDir
                {
                    val = NPOI.OpenXmlFormats.Dml.Chart.ST_BarDir.col
                };

                barChart.grouping = new NPOI.OpenXmlFormats.Dml.Chart.CT_BarGrouping
                {
                    val = NPOI.OpenXmlFormats.Dml.Chart.ST_BarGrouping.stacked
                };

                barChart.overlap = new NPOI.OpenXmlFormats.Dml.Chart.CT_Overlap
                {
                    val = 100
                };
            }

            // 4️⃣ AUTO SIZE
            for (int i = 0; i < columnMappings.Count; i++)
                sheet.AutoSizeColumn(i);

            using var stream = new MemoryStream();
            workbook.Write(stream);
            return stream.ToArray();
        }

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
            var anchor = drawing.CreateAnchor(0, 0, 0, 0, col + 1, 1, col + 14, 22);
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
                    min = new NPOI.OpenXmlFormats.Dml.Chart.CT_Double { val = minAxis }, // ✅ 500
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

        //---COMBO CHART -----// 
        //-------- NPOI SUPPORT NAHII KARTA ----//
    //    public static async Task<byte[]> ExportExcelWithComboChartAsync(
    //IEnumerable<VehicleDistanceExportDto> data,
    //string sheetName = "Distance Report",
    //string chartTitle = "Vehicle Distance Report")
    //    {
    //        if (data == null || !data.Any())
    //            return Array.Empty<byte>();

    //        var workbook = new XSSFWorkbook();
    //        var sheet = workbook.CreateSheet(sheetName);

    //        // =========================
    //        // ✅ HEADERS
    //        // =========================
    //        var header = sheet.CreateRow(0);
    //        header.CreateCell(0).SetCellValue("Month");
    //        header.CreateCell(1).SetCellValue("Distance (km)");
    //        header.CreateCell(2).SetCellValue("Trip Count");
    //        header.CreateCell(3).SetCellValue("Fuel Consumed");

    //        // =========================
    //        // ✅ DATA
    //        // =========================
    //        int rowIndex = 1;
    //        foreach (var d in data)
    //        {
    //            var row = sheet.CreateRow(rowIndex++);
    //            row.CreateCell(0).SetCellValue(d.Month);
    //            row.CreateCell(1).SetCellValue((double)d.DistanceKM);
    //            row.CreateCell(2).SetCellValue(d.TripCount);
    //            row.CreateCell(3).SetCellValue(d.FuelConsumed);
    //        }

    //        int rowCount = data.Count();

    //        // =========================
    //        // 📊 CREATE CHART
    //        // =========================
    //        var drawing = sheet.CreateDrawingPatriarch();
    //        var anchor = drawing.CreateAnchor(0, 0, 0, 0, 4, 1, 16, 20);
    //        var chart = (XSSFChart)drawing.CreateChart(anchor);

    //        chart.SetTitle(chartTitle);
    //        chart.GetOrCreateLegend().Position = LegendPosition.Bottom;

    //        // =========================
    //        // ✅ AXES
    //        // =========================
    //        var bottomAxis = chart.CreateCategoryAxis(AxisPosition.Bottom);
    //        var leftAxis = chart.CreateValueAxis(AxisPosition.Left);
    //        var rightAxis = chart.CreateValueAxis(AxisPosition.Right);

    //        rightAxis.Crosses = AxisCrosses.Max;
    //        rightAxis.IsVisible = true;

    //        // =========================
    //        // 🔹 DATA RANGES
    //        // =========================
    //        var xRange = new CellRangeAddress(1, rowCount, 0, 0);
    //        var distanceRange = new CellRangeAddress(1, rowCount, 1, 1);
    //        var tripRange = new CellRangeAddress(1, rowCount, 2, 2);

    //        var dataFactory = chart.ChartDataFactory;

    //        // =========================
    //        // 📊 BAR CHART (Distance)
    //        // =========================
    //        var barData = dataFactory.CreateBarChartData<string, double>();

    //        var barSeries = barData.AddSeries(
    //            DataSources.FromStringCellRange(sheet, xRange),
    //            DataSources.FromNumericCellRange(sheet, distanceRange)
    //        );
    //        barSeries.SetTitle("Distance (km)");

    //        chart.Plot(barData, bottomAxis, leftAxis);

    //        // =========================
    //        // 📈 LINE CHART (Trip Count)
    //        // =========================
    //        var lineData = dataFactory.CreateLineChartData<string, double>();

    //        var lineSeries = lineData.AddSeries(
    //            DataSources.FromStringCellRange(sheet, xRange),
    //            DataSources.FromNumericCellRange(sheet, tripRange)
    //        );
    //        lineSeries.SetTitle("Trip Count");

    //        //chart.Plot(lineData, bottomAxis, rightAxis);

    //        chart.Plot(barData, bottomAxis, leftAxis);
    //        chart.Plot(lineData, bottomAxis, rightAxis);
    //        //chart.Plot(barData, bottomAxis, leftAxis);
    //        //chart.Plot(lineData, bottomAxis, rightAxis);
    //        // ✅ AUTO SIZE
    //        // =========================
    //        for (int i = 0; i < 4; i++)
    //            sheet.AutoSizeColumn(i);

    //        // =========================
    //        // 💾 SAVE
    //        // =========================
    //        using var stream = new MemoryStream();
    //        workbook.Write(stream);

    //        return await Task.FromResult(stream.ToArray());
    //    }

    //    public static async Task<byte[]> ExportDynamicPivotExcelWithChartAsync(
    //List<Dictionary<string, object>> rows,
    //string sheetName,
    //string title)
    //    {
    //        if (rows == null || !rows.Any())
    //            return Array.Empty<byte>();


    //        var workbook = new XSSFWorkbook();
    //        var sheet = workbook.CreateSheet(sheetName);

    //        // -----------------------
    //        // TITLE
    //        // -----------------------
    //        var titleRow = sheet.CreateRow(0);
    //        titleRow.CreateCell(0).SetCellValue(title);

    //        // -----------------------
    //        // HEADER
    //        // -----------------------
    //        var headerRow = sheet.CreateRow(2);
    //        int colCount = rows.First().Keys.Count;

    //        int colIndex = 0;
    //        foreach (var key in rows.First().Keys)
    //        {
    //            headerRow.CreateCell(colIndex++).SetCellValue(key);
    //        }

    //        // ==========================
    //        // DATA
    //        // ==========================
    //        int rowIndex = 3;

    //        foreach (var row in rows)
    //        {
    //            var excelRow = sheet.CreateRow(rowIndex++);
    //            colIndex = 0;

    //            foreach (var val in row.Values)
    //            {
    //                if (double.TryParse(val?.ToString(), out double num))
    //                    excelRow.CreateCell(colIndex++).SetCellValue(num);
    //                else
    //                    excelRow.CreateCell(colIndex++).SetCellValue(val?.ToString());
    //            }
    //        }

    //        // ==========================
    //        // STYLES (UI LOOK)
    //        // ==========================
    //        var headerStyle = workbook.CreateCellStyle();
    //        headerStyle.FillForegroundColor = IndexedColors.DarkGreen.Index;
    //        headerStyle.FillPattern = FillPattern.SolidForeground;

    //        var headerFont = workbook.CreateFont();
    //        headerFont.Color = IndexedColors.White.Index;
    //        headerFont.IsBold = true;
    //        headerStyle.SetFont(headerFont);

    //        var totalStyle = workbook.CreateCellStyle();
    //        totalStyle.FillForegroundColor = IndexedColors.LightGreen.Index;
    //        totalStyle.FillPattern = FillPattern.SolidForeground;

    //        var boldFont = workbook.CreateFont();
    //        boldFont.IsBold = true;
    //        totalStyle.SetFont(boldFont);

    //        // ==========================
    //        // APPLY HEADER STYLE
    //        // ==========================
    //        for (int i = 0; i < colCount; i++)
    //        {
    //            headerRow.GetCell(i).CellStyle = headerStyle;
    //        }

    //        // ==========================
    //        // TOTAL ROW
    //        // ==========================
    //        var totalRow = sheet.CreateRow(rowIndex);

    //        totalRow.CreateCell(0).SetCellValue("Total");

    //        for (int c = 1; c < colCount; c++)
    //        {
    //            double sum = 0;
    //            for (int r = 3; r < rowIndex; r++)
    //            {
    //                var cell = sheet.GetRow(r).GetCell(c);
    //                if (cell != null && cell.CellType == CellType.Numeric)
    //                {
    //                    sum += cell.NumericCellValue;
    //                }
    //            }
    //            totalRow.CreateCell(c).SetCellValue(sum);
    //        }

    //        // style total row
    //        for (int i = 0; i < colCount; i++)
    //        {
    //            totalRow.GetCell(i).CellStyle = totalStyle;
    //        }

    //        rowIndex++; // move past total row

    //        // ==========================
    //        // AUTO SIZE COLUMNS
    //        // ==========================
    //        for (int i = 0; i < colCount; i++)
    //            sheet.AutoSizeColumn(i);

    //        // ==========================
    //        // WRITE TO STREAM
    //        // ==========================
    //        using var stream = new MemoryStream();
    //        workbook.Write(stream);

    //        return await Task.FromResult(stream.ToArray());
    //    }

    //    public static async Task<byte[]> ExportExcelWithPieChartAsync(
    //IEnumerable<VehicleTypeDistanceExportDto> data,
    //string sheetName = "Vehicle Type Distance",
    //string chartTitle = "Vehicle Type Distance Share")
    //    {
    //        if (data == null || !data.Any())
    //            return Array.Empty<byte>();

    //        var workbook = new XSSFWorkbook();
    //        var sheet = workbook.CreateSheet(sheetName);

    //        // 1️⃣ HEADERS
    //        var headerRow = sheet.CreateRow(0);
    //        headerRow.CreateCell(0).SetCellValue("Vehicle Type");
    //        headerRow.CreateCell(1).SetCellValue("Total Distance (km)");

    //        // 2️⃣ DATA
    //        int rowIndex = 1;
    //        foreach (var item in data)
    //        {
    //            var row = sheet.CreateRow(rowIndex++);
    //            row.CreateCell(0).SetCellValue(item.VehicleType);
    //            row.CreateCell(1).SetCellValue((double)item.TotalDistanceKM);
    //        }

    //        int rowCount = data.Count(); // number of data rows

    //        // 3️⃣ AUTO SIZE
    //        sheet.AutoSizeColumn(0);
    //        sheet.AutoSizeColumn(1);

    //        // 4️⃣ CHART CREATE
    //        var drawing = sheet.CreateDrawingPatriarch();
    //        var anchor = drawing.CreateAnchor(0, 0, 0, 0, 3, 1, 13, 20);
    //        var chart = drawing.CreateChart(anchor) as XSSFChart;

    //        chart.SetTitle(chartTitle);
    //        chart.GetOrCreateLegend().Position = LegendPosition.Right;

    //        // 5️⃣ PIE CHART WITH CACHE
    //        var pieChart = chart.GetCTChart().AddNewPlotArea().AddNewPieChart();
    //        pieChart.AddNewVaryColors().val = 1;

    //        var ser = pieChart.AddNewSer();
    //        ser.AddNewIdx().val = 0;
    //        ser.AddNewOrder().val = 0;

    //        // CATEGORY (LABELS)
    //        var cat = ser.AddNewCat().AddNewStrRef();
    //        cat.f = $"'{sheetName}'!$A$2:$A${rowCount + 1}";

    //        var catCache = cat.AddNewStrCache();
    //        catCache.ptCount = new CT_UnsignedInt { val = (uint)rowCount };

    //        for (int i = 0; i < rowCount; i++)
    //        {
    //            var pt = catCache.AddNewPt();
    //            pt.idx = (uint)i;
    //            pt.v = data.ElementAt(i).VehicleType;
    //        }

    //        // VALUES
    //        var val = ser.AddNewVal().AddNewNumRef();
    //        val.f = $"'{sheetName}'!$B$2:$B${rowCount + 1}";

    //        var valCache = val.AddNewNumCache();
    //        valCache.formatCode = "General"; // ensures Excel reads numbers properly
    //        valCache.ptCount = new CT_UnsignedInt { val = (uint)rowCount };

    //        for (int i = 0; i < rowCount; i++)
    //        {
    //            var pt = valCache.AddNewPt();
    //            pt.idx = (uint)i;
    //            pt.v = ((double)data.ElementAt(i).TotalDistanceKM).ToString("0");
    //        }

    //        // 6️⃣ WRITE FILE
    //        using var stream = new MemoryStream();
    //        workbook.Write(stream);

    //        return await Task.FromResult(stream.ToArray());
    //    }
    }
}