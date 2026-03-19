using ClosedXML.Excel;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.Common
{
    public static class ExcelExportHelper
    {
        public static async Task<byte[]> ExportToExcelAsync<T>(
            IEnumerable<T> data,
            Dictionary<string, string> columnMappings,
            string sheetName = "Sheet1")
        {
            if (data == null || !data.Any())
                return Array.Empty<byte>();

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add(sheetName);

            // 🔥 TITLE ROW
            worksheet.Range(1, 1, 1, columnMappings.Count).Merge();
            worksheet.Cell(1, 1).Value = "Vehicle Trip Emission Report";
            worksheet.Cell(1, 1).Style.Font.Bold = true;
            worksheet.Cell(1, 1).Style.Font.FontSize = 16;
            worksheet.Cell(1, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

            // 🔥 SUBTITLE ROW (Generated Date)
            //worksheet.Range(2, 1, 2, columnMappings.Count).Merge();
            //worksheet.Cell(2, 1).Value = $"Generated On: {DateTime.Now:dd-MM-yyyy HH:mm}";
            //worksheet.Cell(2, 1).Style.Font.Italic = true;
            //worksheet.Cell(2, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

            // 🔥 COLUMN HEADERS (Row 3)
            int col = 1;
            foreach (var header in columnMappings.Keys)
            {
                var cell = worksheet.Cell(3, col);
                cell.Value = header;

                // Optional styling
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.LightGray;
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                col++;
            }

            // 🔥 DATA (Row 4 onwards)
            int row = 4;

            foreach (var item in data)
            {
                col = 1;

                foreach (var mapping in columnMappings.Values)
                {
                    var prop = typeof(T).GetProperty(mapping,
                        BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

                    if (prop != null)
                    {
                        var value = prop.GetValue(item);
                        var cell = worksheet.Cell(row, col);

                        if (value == null)
                        {
                            cell.Value = "";
                        }
                        else if (value is DateTime dt)
                        {
                            if (dt == DateTime.MinValue)
                            {
                                cell.Value = "";
                            }
                            else
                            {
                                cell.Value = dt;
                                cell.Style.DateFormat.Format = "dd-MM-yyyy HH:mm";
                            }
                        }
                        else if (value is decimal || value is double || value is float)
                        {
                            cell.Value = Convert.ToDouble(value);
                        }
                        else if (value is int || value is long)
                        {
                            cell.Value = Convert.ToInt64(value);
                        }
                        else
                        {
                            cell.Value = value.ToString();
                        }
                    }

                    col++;
                }

                row++;
            }

            // 🔥 AUTO ADJUST COLUMN WIDTH
            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }
    }
}