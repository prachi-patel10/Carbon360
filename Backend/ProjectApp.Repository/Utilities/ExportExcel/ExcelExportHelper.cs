using ClosedXML.Excel;
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
    }
}