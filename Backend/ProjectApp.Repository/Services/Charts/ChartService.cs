using Microsoft.EntityFrameworkCore;
using NPOI.SS.UserModel.Charts;
using NPOI.SS.Util;
using NPOI.XSSF.UserModel;
using ProjectApp.Core.DTOs.Charts;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Charts;
using ProjectApp.Repository.Services.Common;

namespace ProjectApp.Repository.Services.Charts
{
    public class ChartService : IChartService
    {
        private readonly CBContext _context;

        // ── Fuel type colors (keyed by fuel name from DB) ─────────────────
        private static readonly Dictionary<string, string> _fuelColors = new()
        {
            { "Diesel",  "#378ADD" },
            { "Petrol",  "#1D9E75" },
            { "CNG",     "#EF9F27" },
            { "LPG",     "#D4537E" },
            { "HSD",     "#534AB7" },
            { "Biomass", "#D85A30" },
        };
        private static readonly string _defaultColor = "#888888";

        // ── Pie / bar chart colors ────────────────────────────────────────
        private static readonly string[] _pieColors =
        {
            "#378ADD", "#1D9E75", "#EF9F27", "#D4537E",
            "#534AB7", "#D85A30", "#06b6d4", "#8b5cf6",
            "#ec4899", "#14b8a6", "#f97316", "#84cc16"
        };

        // ── Line chart colors ─────────────────────────────────────────────
        private static readonly string[] _lineColors =
        {
            "#378ADD", "#1D9E75", "#EF9F27", "#D4537E",
            "#534AB7", "#D85A30", "#06b6d4", "#8b5cf6",
            "#ec4899", "#14b8a6", "#f97316", "#84cc16"
        };

        // ── Vehicle type colors ───────────────────────────────────────────
        private static readonly string[] _vehicleTypeColors =
        {
            "#378ADD", "#1D9E75", "#EF9F27", "#D4537E",
            "#534AB7", "#D85A30", "#06b6d4", "#8b5cf6",
            "#ec4899", "#14b8a6", "#f97316", "#84cc16"
        };

        // ── Emission line colors ──────────────────────────────────────────
        private static readonly Dictionary<string, string> _emissionColors = new()
        {
            { "Total", "#378ADD" },
            { "CO2",   "#1D9E75" },
            { "NO2",   "#EF9F27" },
            { "CH4",   "#D4537E" },
        };

        private static readonly string[] _monthNames =
            { "Jan","Feb","Mar","Apr","May","Jun",
              "Jul","Aug","Sep","Oct","Nov","Dec" };

        public ChartService(CBContext context)
        {
            _context = context;
        }

        // ─────────────────────────────────────────────────────────────────
        // PRIVATE HELPERS
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// Converts a list of MonthlyEmissionRawDto rows (from any emission SP)
        /// into the standard 4-dataset line chart response (Total, CO2, NO2, CH4).
        /// Months with no data default to 0.
        /// </summary>
        private MonthlyEmissionChartResponseDto BuildEmissionChart(
    List<MonthlyEmissionRawDto> rawRows, DateTime from, DateTime to)
        {
            var slots = BuildMonthSlots(from, to);

            List<decimal> Monthly(Func<MonthlyEmissionRawDto, decimal> selector) =>
                slots.Select(s =>
                {
                    var row = rawRows.FirstOrDefault(r => r.YearNumber == s.Year && r.MonthNumber == s.Month);
                    return row != null ? selector(row) : 0m;
                }).ToList();

            return new MonthlyEmissionChartResponseDto
            {
                Labels = slots.Select(s => s.Label).ToList(),
                Datasets = new List<EmissionLineDataset>
        {
            new() { Label="Total CO2e (kg)", EmissionType="Total",
                    Color=_emissionColors["Total"], Data=Monthly(r=>r.TotalEmission) },
            new() { Label="CO2 (kg)",        EmissionType="CO2",
                    Color=_emissionColors["CO2"],   Data=Monthly(r=>r.TotalCO2) },
            new() { Label="NO2 (kg)",        EmissionType="NO2",
                    Color=_emissionColors["NO2"],   Data=Monthly(r=>r.TotalNO2) },
            new() { Label="CH4 (kg)",        EmissionType="CH4",
                    Color=_emissionColors["CH4"],   Data=Monthly(r=>r.TotalCH4) },
        }
            };
        }

        private static readonly Dictionary<string, string> _categoryColors = new()
{
    { "LDV", "#378ADD" },
    { "MDV", "#1D9E75" },   
    { "HDV", "#D85A30" },
    { "LCV", "#EF9F27" },
    { "HCV", "#EF9F27" },
    { "Two Wheeler",   "#D4537E" },
    { "Three Wheeler", "#534AB7" },
};

        // ─────────────────────────────────────────────────────────────────
        // FUEL CONSUMPTION
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// GET /api/Chart/VehicleMonthly
        /// SP : USP_CB_VehicleFuelMonthlyConsumption
        /// Returns fuel consumption per fuel type per month for vehicles.
        /// Columns: FuelType, Source='Vehicle', MonthNumber, MonthName, TotalFuelConsumed
        /// </summary>
        public async Task<List<FuelTypeMonthlyConsumptionDto>> GetVehicleFuelMonthlyConsumptionAsync(
    DateTime fromDate, DateTime toDate)
    => await _context.Set<FuelTypeMonthlyConsumptionDto>()
        .FromSqlInterpolated(
            $"EXEC USP_CB_VehicleFuelMonthlyConsumption {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
        .ToListAsync();

        /// <summary>
        /// GET /api/Chart/GeneratorMonthly
        /// SP : USP_CB_GeneratorFuelMonthlyConsumption
        /// Returns fuel consumption per fuel type per month for generators.
        /// Columns: FuelType, Source='Generator', MonthNumber, MonthName, TotalFuelConsumed
        /// </summary>
        public async Task<List<FuelTypeMonthlyConsumptionDto>> GetGeneratorFuelMonthlyConsumptionAsync(
    DateTime fromDate, DateTime toDate)
    => await _context.Set<FuelTypeMonthlyConsumptionDto>()
        .FromSqlInterpolated(
            $"EXEC USP_CB_GeneratorFuelMonthlyConsumption {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
        .ToListAsync();

        /// <summary>
        /// GET /api/Chart/CombinedFuelChart
        /// SP : USP_CB_CombinedFuelMonthlyConsumption
        /// Combines vehicle + generator fuel consumption into a stacked bar chart.
        /// Solid color = Vehicle, 50% transparent (hex + "80") = Generator.
        /// </summary>
        public async Task<FuelCombinedChartResponseDto> GetCombinedFuelChartAsync(
    DateTime fromDate, DateTime toDate)
        {
            var allRows = await _context.Set<FuelTypeMonthlyConsumptionDto>()
                .FromSqlInterpolated(
                    $"EXEC USP_CB_CombinedFuelMonthlyConsumption {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
                .ToListAsync();

            var slots = BuildMonthSlots(fromDate, toDate);
            var groups = allRows
                .Select(r => new { r.FuelType, r.Source })
                .Distinct()
                .OrderBy(g => g.FuelType).ThenBy(g => g.Source)
                .ToList();

            var datasets = groups.Select(g =>
            {
                var baseColor = _fuelColors.GetValueOrDefault(g.FuelType, _defaultColor);
                var color = g.Source == "Vehicle" ? baseColor : baseColor + "80";

                return new FuelStackDataset
                {
                    Label = $"{g.FuelType} ({g.Source})",
                    FuelType = g.FuelType,
                    Source = g.Source,
                    Color = color,
                    Data = slots.Select(s =>
                        allRows.FirstOrDefault(r =>
                            r.FuelType == g.FuelType &&
                            r.Source == g.Source &&
                            r.YearNumber == s.Year &&
                            r.MonthNumber == s.Month)
                        ?.TotalFuelConsumed ?? 0m).ToList()
                };
            }).ToList();

            return new FuelCombinedChartResponseDto
            {
                Labels = slots.Select(s => s.Label).ToList(),
                Datasets = datasets
            };
        }

        // ─────────────────────────────────────────────────────────────────
        // EMISSION CHARTS
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// GET /api/Chart/VehicleEmissionChart
        /// SP : USP_CB_VehicleEmissionMonthlyChart
        /// 4 line datasets (TotalCO2e, CO2, NO2, CH4) per month for vehicles.
        /// Columns: MonthNumber, TotalCO2, TotalNO2, TotalCH4, TotalEmission
        /// </summary>
        public async Task<MonthlyEmissionChartResponseDto> GetVehicleEmissionChartAsync(
    DateTime fromDate, DateTime toDate)
        {
            var rows = await _context.Set<MonthlyEmissionRawDto>()
                .FromSqlInterpolated(
                    $"EXEC USP_CB_VehicleEmissionMonthlyChart {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
                .ToListAsync();
            return BuildEmissionChart(rows, fromDate, toDate);
        }

        /// <summary>
        /// GET /api/Chart/GeneratorEmissionChart
        /// SP : USP_CB_GeneratorEmissionMonthlyChart
        /// 4 line datasets (TotalCO2e, CO2, NO2, CH4) per month for generators.
        /// Columns: MonthNumber, TotalCO2, TotalNO2, TotalCH4, TotalEmission
        /// </summary>
        public async Task<MonthlyEmissionChartResponseDto> GetGeneratorEmissionChartAsync(
    DateTime fromDate, DateTime toDate)
        {
            var rows = await _context.Set<MonthlyEmissionRawDto>()
                .FromSqlInterpolated(
                    $"EXEC USP_CB_GeneratorEmissionMonthlyChart {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
                .ToListAsync();
            return BuildEmissionChart(rows, fromDate, toDate);
        }

        // ─────────────────────────────────────────────────────────────────
        // GENERATOR RUN HOURS
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// GET /api/Chart/GeneratorRunHours
        /// SP : USP_CB_GeneratorRunHoursByBase
        /// Pie chart — one slice per generator showing total run hours for the year.
        /// Columns: GeneratorName, SiteName, TotalRunHours, TotalFuelConsumed, TotalPowerOutputKWH
        /// </summary>
        public async Task<GeneratorRunHoursChartResponseDto> GetGeneratorRunHoursByBaseAsync(DateTime fromDate, DateTime toDate)
        {
            var rows = await _context.Set<GeneratorRunHoursRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorRunHoursByBase {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
                .ToListAsync();

            return new GeneratorRunHoursChartResponseDto
            {
                Labels = rows.Select(r => r.GeneratorName).ToList(),
                Data = rows.Select(r => r.TotalRunHours).ToList(),
                Colors = rows.Select((_, i) => _pieColors[i % _pieColors.Length]).ToList(),
                SiteNames = rows.Select(r => r.SiteName ?? "-").ToList(),
                FuelConsumed = rows.Select(r => r.TotalFuelConsumed).ToList(),
                PowerOutput = rows.Select(r => r.TotalPowerOutputKWH).ToList(),
            };
        }


        /// <summary>
        /// GET /api/Chart/GeneratorRunHoursMonthly
        /// SP : USP_CB_GeneratorRunHoursMonthly
        /// Pivot table / grouped bar chart — run hours per generator per month.
        /// Columns: GeneratorName, MonthNumber, TotalRunHours, TotalFuelConsumed,
        ///          TotalPowerOutputKWH, OperationCount
        /// Pivot: rows = 12 months, columns = generators
        /// </summary>
        public async Task<GeneratorRunHoursMonthlyPivotDto> GetGeneratorRunHoursMonthlyAsync(DateTime fromDate, DateTime toDate)
        {
            var rows = await _context.Set<GeneratorRunHoursMonthlyRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorRunHoursMonthly {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
                .ToListAsync();

            var generators = rows.Select(r => r.GeneratorName).Distinct().OrderBy(n => n).ToList();
            var colors = generators.Select((_, i) => _lineColors[i % _lineColors.Length]).ToList();

            var rhMatrix = new List<List<decimal>>();
            var fuelMatrix = new List<List<decimal>>();
            var powerMatrix = new List<List<decimal>>();
            var monthTotals = new List<decimal>();

            for (int m = 1; m <= 12; m++)
            {
                var rhRow = new List<decimal>();
                var fuelRow = new List<decimal>();
                var powerRow = new List<decimal>();

                foreach (var gen in generators)
                {
                    var cell = rows.FirstOrDefault(r => r.MonthNumber == m && r.GeneratorName == gen);
                    rhRow.Add(cell?.TotalRunHours ?? 0m);
                    fuelRow.Add(cell?.TotalFuelConsumed ?? 0m);
                    powerRow.Add(cell?.TotalPowerOutputKWH ?? 0m);
                }

                rhMatrix.Add(rhRow);
                fuelMatrix.Add(fuelRow);
                powerMatrix.Add(powerRow);
                monthTotals.Add(rhRow.Sum());
            }

            var generatorTotals = generators
                .Select((_, gi) => rhMatrix.Sum(row => row[gi]))
                .ToList();

            return new GeneratorRunHoursMonthlyPivotDto
            {
                MonthLabels = _monthNames.ToList(),
                GeneratorNames = generators,
                Colors = colors,
                RunHoursMatrix = rhMatrix,
                FuelMatrix = fuelMatrix,
                PowerMatrix = powerMatrix,
                MonthTotals = monthTotals,
                GeneratorTotals = generatorTotals,
                GrandTotal = monthTotals.Sum()
            };
        }

        // ─────────────────────────────────────────────────────────────────
        // GENERATOR LOAD FACTOR
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// GET /api/Chart/GeneratorLoadFactor
        /// SP : USP_CB_GeneratorLoadFactorMonthly
        /// Multi-line chart — one line per generator showing Avg/Max/Min load factor per month.
        /// Columns: GeneratorName, MonthNumber, AvgLoadFactor, MaxLoadFactor,
        ///          MinLoadFactor, OperationCount
        /// </summary>
        public async Task<GeneratorLoadFactorChartResponseDto> GetGeneratorLoadFactorMonthlyAsync(DateTime fromDate, DateTime toDate)
        {
            var rows = await _context.Set<GeneratorLoadFactorRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorLoadFactorMonthly {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
                .ToListAsync();

            var generators = rows.Select(r => r.GeneratorName).Distinct().OrderBy(n => n).ToList();

            var datasets = generators.Select((genName, idx) =>
            {
                var genRows = rows.Where(r => r.GeneratorName == genName).ToList();
                var avg = new decimal[12];
                var max = new decimal[12];
                var min = new decimal[12];
                var opCount = new int[12];

                foreach (var row in genRows)
                {
                    var i = row.MonthNumber - 1;
                    avg[i] = row.AvgLoadFactor;
                    max[i] = row.MaxLoadFactor;
                    min[i] = row.MinLoadFactor;
                    opCount[i] = row.OperationCount;
                }

                return new LoadFactorLineDataset
                {
                    GeneratorName = genName,
                    Color = _lineColors[idx % _lineColors.Length],
                    AvgData = avg.ToList(),
                    MaxData = max.ToList(),
                    MinData = min.ToList(),
                    OpCountData = opCount.ToList()
                };
            }).ToList();

            return new GeneratorLoadFactorChartResponseDto
            {
                Labels = _monthNames.ToList(),
                Datasets = datasets
            };
        }

        // ─────────────────────────────────────────────────────────────────
        // VEHICLE DISTANCE
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// GET /api/Chart/VehicleDistanceMonthly
        /// SP : USP_CB_VehicleTotalDistanceMonthly
        /// Single-series bar chart — total distance driven per month.
        /// Columns: MonthNumber, MonthName, TotalDistanceKM, TotalTrips, TotalFuelConsumed
        /// </summary>
        public async Task<VehicleDistanceChartResponseDto> GetVehicleTotalDistanceMonthlyAsync(
    DateTime fromDate, DateTime toDate)
        {
            var rows = await _context.Set<VehicleDistanceMonthlyRawDto>()
                .FromSqlInterpolated(
                    $"EXEC USP_CB_VehicleTotalDistanceMonthly {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
                .ToListAsync();

            var slots = BuildMonthSlots(fromDate, toDate);
            var distance = slots.Select(s => rows.FirstOrDefault(r => r.YearNumber == s.Year && r.MonthNumber == s.Month)?.TotalDistanceKM ?? 0m).ToList();
            var trips = slots.Select(s => rows.FirstOrDefault(r => r.YearNumber == s.Year && r.MonthNumber == s.Month)?.TotalTrips ?? 0).ToList();
            var fuel = slots.Select(s => rows.FirstOrDefault(r => r.YearNumber == s.Year && r.MonthNumber == s.Month)?.TotalFuelConsumed ?? 0m).ToList();

            return new VehicleDistanceChartResponseDto
            {
                Labels = slots.Select(s => s.Label).ToList(),
                DistanceData = distance,
                TripData = trips,
                FuelData = fuel,
            };
        }

        /// <summary>
        /// GET /api/Chart/VehicleTypeDistance
        /// SP : USP_CB_VehicleTypeWiseDistance
        /// Pivot / stacked bar chart — distance per vehicle type per month.
        /// Columns: MonthNumber, MonthName, VehicleTypeName, TotalDistanceKM,
        ///          TotalTrips, TotalFuelConsumed
        /// Pivot: rows = 12 months, columns = vehicle types
        /// </summary>
        public async Task<VehicleTypeDistancePivotDto> GetVehicleTypeWiseDistanceAsync(
    DateTime fromDate, DateTime toDate)
        {
            var rows = await _context.Set<VehicleTypeDistanceRawDto>()
                .FromSqlInterpolated(
                    $"EXEC USP_CB_VehicleTypeWiseDistance {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
                .ToListAsync();

            var slots = BuildMonthSlots(fromDate, toDate);
            var vehicleTypes = rows.Select(r => r.VehicleTypeName).Distinct().OrderBy(n => n).ToList();
            var colors = vehicleTypes.Select((_, i) => _vehicleTypeColors[i % _vehicleTypeColors.Length]).ToList();

            var distMatrix = new List<List<decimal>>();
            var tripsMatrix = new List<List<int>>();
            var fuelMatrix = new List<List<decimal>>();
            var monthTotals = new List<decimal>();

            foreach (var s in slots)
            {
                var distRow = vehicleTypes.Select(vt =>
                    rows.FirstOrDefault(r => r.YearNumber == s.Year && r.MonthNumber == s.Month && r.VehicleTypeName == vt)
                        ?.TotalDistanceKM ?? 0m).ToList();
                var tripsRow = vehicleTypes.Select(vt =>
                    rows.FirstOrDefault(r => r.YearNumber == s.Year && r.MonthNumber == s.Month && r.VehicleTypeName == vt)
                        ?.TotalTrips ?? 0).ToList();
                var fuelRow = vehicleTypes.Select(vt =>
                    rows.FirstOrDefault(r => r.YearNumber == s.Year && r.MonthNumber == s.Month && r.VehicleTypeName == vt)
                        ?.TotalFuelConsumed ?? 0m).ToList();

                distMatrix.Add(distRow);
                tripsMatrix.Add(tripsRow);
                fuelMatrix.Add(fuelRow);
                monthTotals.Add(distRow.Sum());
            }

            var typeTotals = vehicleTypes
                .Select((_, ti) => distMatrix.Sum(row => row[ti]))
                .ToList();

            return new VehicleTypeDistancePivotDto
            {
                MonthLabels = slots.Select(s => s.Label).ToList(),
                VehicleTypes = vehicleTypes,
                Colors = colors,
                DistanceMatrix = distMatrix,
                TripsMatrix = tripsMatrix,
                FuelMatrix = fuelMatrix,
                MonthTotals = monthTotals,
                TypeTotals = typeTotals,
                GrandTotal = monthTotals.Sum()
            };
        }

        // ─────────────────────────────────────────────────────────────────
        // CITY / SITE EMISSIONS
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// GET /api/Chart/VehicleCityEmissions
        /// SP : USP_CB_VehicleCityWiseEmissions
        /// Bar / donut chart — vehicle emissions grouped by departure city.
        /// Columns: CityName, TotalCO2, TotalNO2, TotalCH4, TotalCO2e
        /// </summary>
        public async Task<List<CityEmissionDto>> GetVehicleCityWiseEmissionsAsync(
    DateTime fromDate, DateTime toDate)
    => await _context.Set<CityEmissionDto>()
        .FromSqlInterpolated(
            $"EXEC USP_CB_VehicleCityWiseEmissions {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
        .ToListAsync();

        /// <summary>
        /// GET /api/Chart/GeneratorSiteEmissions
        /// SP : USP_CB_GeneratorSiteWiseEmissions
        /// Bar / donut chart — generator emissions grouped by site location.
        /// Columns: SiteName, TotalCO2, TotalNO2, TotalCH4, TotalCO2e
        /// </summary>
        public async Task<List<SiteEmissionDto>> GetGeneratorSiteWiseEmissionsAsync(
    DateTime fromDate, DateTime toDate)
    => await _context.Set<SiteEmissionDto>()
        .FromSqlInterpolated(
            $"EXEC USP_CB_GeneratorSiteWiseEmissions {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
        .ToListAsync();

        // ─────────────────────────────────────────────────────────────────
        // DASHBOARD SUMMARIES
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// GET /api/Chart/VehicleSummary
        /// SP : USP_CB_VehicleSummary
        /// KPI cards — vehicle totals for the year (CO2e, fuel, distance, trips).
        /// </summary>
        public async Task<VehicleSummaryDto> GetVehicleSummaryAsync(
    DateTime fromDate, DateTime toDate)
        {
            var result = await _context.Set<VehicleSummaryDto>()
                .FromSqlInterpolated(
                    $"EXEC USP_CB_VehicleSummary {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
                .ToListAsync();
            return result.FirstOrDefault() ?? new VehicleSummaryDto();
        }

        /// <summary>
        /// GET /api/Chart/GeneratorSummary
        /// SP : USP_CB_GeneratorSummary
        /// KPI cards — generator totals for the year (CO2e, fuel, run hours, power).
        /// </summary>
        public async Task<GeneratorSummaryDto> GetGeneratorSummaryAsync(
    DateTime fromDate, DateTime toDate)
        {
            var result = await _context.Set<GeneratorSummaryDto>()
                .FromSqlInterpolated(
                    $"EXEC USP_CB_GeneratorSummary {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
                .ToListAsync();
            return result.FirstOrDefault() ?? new GeneratorSummaryDto();
        }


        public async Task<byte[]> ExportVehicleFuelExcelAsync(DateTime fromDate, DateTime toDate)
        {
            var data = await GetVehicleFuelMonthlyConsumptionAsync(fromDate, toDate);

            var rows = Enumerable.Range(1, 12).Select(m =>
            {
                var monthData = data.Where(x => x.MonthNumber == m).ToList();

                return new VehicleFuelExportDto
                {
                    Month = _monthNames[m - 1],

                    Diesel = monthData
                        .Where(x => x.FuelType == "Diesel")
                        .Sum(x => x.TotalFuelConsumed),

                    Petrol = monthData
                        .Where(x => x.FuelType == "Petrol")
                        .Sum(x => x.TotalFuelConsumed),

                    CNG = monthData
                        .Where(x => x.FuelType == "CNG")
                        .Sum(x => x.TotalFuelConsumed),

                    LPG = monthData
                        .Where(x => x.FuelType == "LPG")
                        .Sum(x => x.TotalFuelConsumed)
                };
            }).ToList();

            var columns = new Dictionary<string, string>
            {
                { "Month", "Month" },
                { "Petrol", "Petrol" },
                 { "Diesel", "Diesel" },
                { "CNG", "CNG" },
                { "LPG", "LPG" }
            };

            return await ExcelExportHelper.ExportExcelWithChartAsync<VehicleFuelExportDto>(
                rows,
                columns,
                "Fuel Report",
                $"Vehicle Fuel Report - {fromDate:yyyy-MM-dd}_to_{toDate:yyyy-MM-dd}"
            );
        }


        public async Task<byte[]> ExportVehicleEmissionExcelAsync(DateTime fromDate, DateTime toDate)
        {
            var raw = await _context.Set<MonthlyEmissionRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_VehicleEmissionMonthlyChart {fromDate:yyyy-MM-dd} ,  {toDate:yyyy-MM-dd}")
                .ToListAsync();

            var rows = Enumerable.Range(1, 12).Select(m =>
            {
                var row = raw.FirstOrDefault(r => r.MonthNumber == m);
                return new VehicleEmissionExportDto
                {
                    Month = _monthNames[m - 1],
                    TotalCO2e = (double)(row?.TotalEmission ?? 0m),
                    TotalCO2 = (double)(row?.TotalCO2 ?? 0m),
                    TotalNO2 = (double)(row?.TotalNO2 ?? 0m),
                    TotalCH4 = (double)(row?.TotalCH4 ?? 0m),
                };
            }).ToList();

            var columns = new Dictionary<string, string>
    {
        { "Month",           "Month"     },
        { "Total CO2e (kg)", "TotalCO2e" },
        { "CO2 (kg)",        "TotalCO2"  },
        { "NO2 (kg)",        "TotalNO2"  },
        { "CH4 (kg)",        "TotalCH4"  },
    };

            // ✅ Use LINE chart method now
            return await ExcelExportHelper.ExportExcelWithLineChartAsync<VehicleEmissionExportDto>(
                rows,
                columns,
                "Emission Report",
                $"Vehicle Emission Report - {fromDate:yyyy-MM-dd} ,  {toDate:yyyy-MM-dd}"
            );
        }

        public async Task<byte[]> ExportVehicleDistanceExcelAsync(DateTime fromDate, DateTime toDate)
        {
            var data = await GetVehicleTotalDistanceMonthlyAsync(fromDate, toDate);

            var rows = Enumerable.Range(1, 12).Select(m =>
            {
                int idx = m - 1;
                return new VehicleDistanceExportDto
                {
                    Month = _monthNames[idx],
                    DistanceKM = (double)data.DistanceData[idx],
                    TripCount = data.TripData[idx],
                    FuelConsumed = (double)data.FuelData[idx]
                };
            }).ToList();

            // ✅ Use COMBO chart method (Bar + Line)
            return await ExcelExportHelper.ExportExcelWithComboChartAsync(
                rows,
                "Distance Report",
                $"Vehicle Distance Report - {fromDate:yyyy-MM-dd}  ,   {toDate:yyyy-MM-dd}"
            );
        }

        public async Task<byte[]> ExportVehicleTypeDistanceExcelAsync(DateTime fromDate, DateTime toDate)
        {
            var data = await GetVehicleTypeWiseDistanceAsync(fromDate, toDate);

            //var rows = new List<dynamic>();
            var rows = new List<Dictionary<string, object>>();


            for (int mi = 0; mi < data.MonthLabels.Count; mi++)
            {
                var row = new Dictionary<string, object>();
                row["Month"] = data.MonthLabels[mi];

                for (int ti = 0; ti < data.VehicleTypes.Count; ti++)
                {
                    row[data.VehicleTypes[ti]] = data.DistanceMatrix[mi][ti];
                }

                row["Total"] = data.MonthTotals[mi];

                rows.Add(row);
            }

            return await ExcelExportHelper.ExportDynamicPivotExcelWithChartAsync(
            rows,
            "Vehicle Type Distance",
            $"Vehicle Type Distance Report - {fromDate:yyyy-MM-dd}  ,   {toDate:yyyy-MM-dd}"
        );
        }

        public static async Task<byte[]> ExportExcelWithPieChartAsync<T>(
    IEnumerable<T> data,
    Dictionary<string, string> columnMappings,
    string sheetName = "Sheet1",
    string chartTitle = "Pie Chart")
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

            // 3️⃣ PIE CHART
            var drawing = sheet.CreateDrawingPatriarch();
            var anchor = drawing.CreateAnchor(0, 0, 0, 0, col + 1, 1, col + 10, 20);

            var chart = (XSSFChart)drawing.CreateChart(anchor);
            chart.SetTitle(chartTitle);
            chart.GetOrCreateLegend().Position = LegendPosition.Right;

            var dataFactory = chart.ChartDataFactory;
            var pieData = dataFactory.CreatePieChartData<string, double>();

            int rowCount = data.Count();

            var categoryRange = DataSources.FromStringCellRange(sheet,
                new CellRangeAddress(1, rowCount, 0, 0)); // Labels

            var valueRange = DataSources.FromNumericCellRange(sheet,
                new CellRangeAddress(1, rowCount, 1, 1)); // Values

            pieData.AddSeries(categoryRange, valueRange);

            chart.Plot(pieData);

            // ✅ AUTO SIZE
            for (int i = 0; i < columnMappings.Count; i++)
                sheet.AutoSizeColumn(i);

            using var stream = new MemoryStream();
            workbook.Write(stream);
            return stream.ToArray();
        }

        public async Task<byte[]> ExportVehicleTypeDistancePieExcelAsync(DateTime fromDate, DateTime toDate)
        {
            var data = await GetVehicleTypeWiseDistanceAsync(fromDate, toDate);

            return await ExcelExportHelper.ExportVehicleTypePieChartAsync(
            data.VehicleTypes, // labels
                    data.TypeTotals, // values
                    "Vehicle Type Report",
            $"Vehicle Type Distance - {fromDate:yyyy-MM-dd}  ,   {toDate:yyyy-MM-dd}"
            );
        }


        public async Task<byte[]> ExportCityWiseEmissionExcelAsync(DateTime fromDate, DateTime toDate)
        {
            var data = await GetVehicleCityWiseEmissionsAsync(fromDate, toDate);
            if (data == null || !data.Any())
                return Array.Empty<byte>();

            var cities = data.Select(x => x.CityName).ToList();
            var co2Values = data.Select(x => x.TotalCO2).ToList();  // ✅ TotalCO2
            var no2Values = data.Select(x => x.TotalNO2).ToList();  // ✅ TotalNO2
            var ch4Values = data.Select(x => x.TotalCH4).ToList();  // ✅ TotalCH4

            return await ExcelExportHelper.ExportCityWiseEmissionStackedBarChartAsync(
                cities: cities,
                co2Values: co2Values,
                no2Values: no2Values,
                ch4Values: ch4Values,
                sheetName: "City Emission Report",
                chartTitle: $"City Wise Emission Profile - {fromDate:yyyy-MM-dd} ,  {toDate:yyyy-MM-dd}"
            );
        }

        public async Task<VehicleCategoryChartResponseDto> GetVehicleCategoryWiseEmissionAsync(
    DateTime fromDate, DateTime toDate)
        {
            var rows = await _context.Set<VehicleCategoryEmissionRawDto>()
                .FromSqlInterpolated(
                    $"EXEC USP_CB_VehicleCategoryWiseEmission {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
                .ToListAsync();

            return new VehicleCategoryChartResponseDto
            {
                Labels = rows.Select(r => r.CategoryName).ToList(),
                DistanceData = rows.Select(r => r.TotalDistanceKm).ToList(),
                EmissionData = rows.Select(r => r.TotalEmission).ToList(),
                Colors = rows.Select((_, i) => _pieColors[i % _pieColors.Length]).ToList()
            };
        }

        //public async Task<byte[]> ExportVehicleCategoryEmissionExcelAsync(int year)
        //{
        //    var data = await GetVehicleCategoryWiseEmissionAsync(year);
        //    if (!data.Labels.Any()) return Array.Empty<byte>();

        //    var rows = data.Labels.Select((cat, i) => new Dictionary<string, object>
        //    {
        //        ["Vehicle Category"] = cat,
        //        ["Distance (km)"] = data.DistanceData[i],
        //        ["Emission (kg)"] = data.EmissionData[i]
        //    }).ToList();

        //    return await ExcelExportHelper.ExportDynamicPivotExcelWithChartAsync(
        //        rows,
        //        "Category Emission",
        //        $"Vehicle Category Emission - {year}"
        //    );
        //}

        //public async Task<byte[]> ExportCityWiseEmissionExcelAsync(int year)
        //{
        //    var data = await GetVehicleCityWiseEmissionsAsync(year);
        //    if (data == null || !data.Any())
        //        return Array.Empty<byte>();

        //    var cities = data.Select(x => x.CityName).ToList();
        //    var co2Values = data.Select(x => x.TotalCO2).ToList();  // ✅ TotalCO2
        //    var no2Values = data.Select(x => x.TotalNO2).ToList();  // ✅ TotalNO2
        //    var ch4Values = data.Select(x => x.TotalCH4).ToList();  // ✅ TotalCH4

        //    return await ExcelExportHelper.ExportCityWiseEmissionStackedBarChartAsync(
        //        cities: cities,
        //        co2Values: co2Values,
        //        no2Values: no2Values,
        //        ch4Values: ch4Values,
        //        sheetName: "City Emission Report",
        //        chartTitle: $"City Wise Emission Profile - {year}"
        //    );
        //}

        public async Task<byte[]> ExportCityWiseEmissionExcelGeneratorAsync(DateTime fromDate, DateTime toDate)
        {
            // Generator SP call karo (already exist karta hai)
            var data = await GetGeneratorFuelMonthlyConsumptionAsync(fromDate, toDate);

            var rows = Enumerable.Range(1, 12).Select(m =>
            {
                var monthData = data.Where(x => x.MonthNumber == m).ToList();

                return new GeneratorFuelExportDto
                {
                    Month = _monthNames[m - 1],
                    Diesel = monthData.Where(x => x.FuelType == "Diesel").Sum(x => x.TotalFuelConsumed),
                    Petrol = monthData.Where(x => x.FuelType == "Petrol").Sum(x => x.TotalFuelConsumed),
                    CNG = monthData.Where(x => x.FuelType == "CNG").Sum(x => x.TotalFuelConsumed),
                    LPG = monthData.Where(x => x.FuelType == "LPG").Sum(x => x.TotalFuelConsumed),
                };
            }).ToList();

            var columns = new Dictionary<string, string>
    {
        { "Month",  "Month"  },
        { "Diesel", "Diesel" },
        { "Petrol", "Petrol" },
        { "CNG",    "CNG"    },
        { "LPG",    "LPG"    }
    };

            return await ExcelExportHelper.ExportExcelWithClusteredBarChartAsync<GeneratorFuelExportDto>(
                rows,
                columns,
                "Generator Fuel Report",
                $"Generator Fuel Report - {fromDate:yyyy-MM-dd}   ,    {toDate:yyyy-MM-dd}"
            );
        }

        public async Task<byte[]> ExportGeneratorEmissionExcelLineChartAsync(DateTime fromDate, DateTime toDate)
        {
            var raw = await _context.Set<MonthlyEmissionRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorEmissionMonthlyChart {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
                .ToListAsync();

            var slots = BuildMonthSlots(fromDate, toDate);

            var rows = slots.Select(s =>
            {
                var row = raw.FirstOrDefault(r => r.YearNumber == s.Year && r.MonthNumber == s.Month);

                var dict = new Dictionary<string, object>();
                dict["Month"] = s.Label;
                dict["Total CO2e (kg)"] = (double)(row?.TotalEmission ?? 0m);
                dict["CO2 (kg)"] = (double)(row?.TotalCO2 ?? 0m);
                dict["NO2 (kg)"] = (double)(row?.TotalNO2 ?? 0m);
                dict["CH4 (kg)"] = (double)(row?.TotalCH4 ?? 0m);

                return dict;
            }).ToList();

            return await ExcelExportHelper.ExportDynamicPivotExcelWithChartAsync(
                rows,
                "Generator Emission Report",
                $"Generator Emission Report - {fromDate:yyyy-MM-dd}_to_{toDate:yyyy-MM-dd}"
            );
        }


        public async Task<byte[]> ExportGeneratorRunHoursMonthlyExcelAsync(DateTime fromDate, DateTime toDate)
        {
            var data = await GetGeneratorRunHoursMonthlyAsync(fromDate, toDate);

            // Rows    = Generators (+ Total row at bottom)
            // Columns = Month + Jan + Feb + ... + Dec + Total (Hrs)

            var rows = new List<Dictionary<string, object>>();

            for (int gi = 0; gi < data.GeneratorNames.Count; gi++)
            {
                var row = new Dictionary<string, object>();
                row["Generator"] = data.GeneratorNames[gi];

                decimal generatorTotal = 0;
                for (int mi = 0; mi < data.MonthLabels.Count; mi++)
                {
                    var val = data.RunHoursMatrix[mi][gi];
                    
                    row[data.MonthLabels[mi]] = val == 0 ? "—" : (object)val;
                    generatorTotal += val;
                }

                row["Total (Hrs)"] = generatorTotal;
                rows.Add(row);
            }

            // ✅ Total row at bottom 
            var totalRow = new Dictionary<string, object>();
            totalRow["Generator"] = "Total (hrs)";

            for (int mi = 0; mi < data.MonthLabels.Count; mi++)
            {
                totalRow[data.MonthLabels[mi]] = data.MonthTotals[mi] == 0
                    ? "—"
                    : (object)data.MonthTotals[mi];
            }

            totalRow["Total (Hrs)"] = data.GrandTotal;
            rows.Add(totalRow);

            return await ExcelExportHelper.ExportGeneratorRunHoursPivotAsync(
                rows,
                data.MonthLabels,
                "Generator Run Hours",
                $"Generator Run Hours Report - {fromDate:yyyy-MM-dd}_to_{toDate:yyyy-MM-dd}"
            );
        }

        public async Task<byte[]> ExportGeneratorRunHoursPieChartAsync(DateTime fromDate, DateTime toDate)
        {
            var rows = await _context.Set<GeneratorRunHoursRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorRunHoursByBase {fromDate:yyyy-MM-dd}, {toDate:yyyy-MM-dd}")
                .ToListAsync();

            var exportRows = rows.Select(r =>
            {
                var dict = new Dictionary<string, object>();

                dict["Generator"] = r.GeneratorName;
                dict["Run Hours"] = (double)r.TotalRunHours;

                return dict;
            }).ToList();

            return await ExcelExportHelper.ExportPieChartExcelGeneratorSecondAsync(
                exportRows,
                "Generator Run Hours",
                $"Generator Run Hours Pie Chart - {fromDate:yyyy-MM-dd}_to_{toDate:yyyy-MM-dd}"
            );
        }


        //public async Task<byte[]> ExportSiteEmissionChartAsync(int year)
        //{
        //    var rows = await _context.Set<SiteEmissionForGeneratorChartDto>()
        //        .FromSqlInterpolated($"EXEC USP_GetSiteEmissionData {year}")
        //        .ToListAsync();

        //    var sites = rows.Select(x => x.SiteName).ToList();
        //    var co2e = rows.Select(x => (double)x.CO2e).ToList();
        //    var co2 = rows.Select(x => (double)x.CO2).ToList();
        //    var no2 = rows.Select(x => (double)x.NO2).ToList();
        //    var ch4 = rows.Select(x => (double)x.CH4).ToList();

        //    return await Task.FromResult(
        //        ExcelExportHelper.ExportExactUIChart(
        //            sites,
        //            co2e,
        //            co2,
        //            no2,
        //            ch4
        //        )
        //    );
        //}
        public async Task<byte[]> ExportSiteEmissionChartAsync(DateTime fromDate, DateTime toDate)
        {
            // ✅ Direct list aa rahi hai
            var rows = await GetGeneratorSiteWiseEmissionsAsync(fromDate, toDate)
                       ?? new List<SiteEmissionDto>();

            // ✅ Mapping
            var sites = rows.Select(x => x.SiteName).ToList();
            var co2e = rows.Select(x => (double)x.TotalCO2e).ToList();
            var co2 = rows.Select(x => (double)x.TotalCO2).ToList();
            var no2 = rows.Select(x => (double)x.TotalNO2).ToList();
            var ch4 = rows.Select(x => (double)x.TotalCH4).ToList();

            // ✅ Excel Chart
            return ExcelExportHelper.ExportExactUIChart(
                sites, co2e, co2, no2, ch4
            );
        }

        public async Task<byte[]> ExportVehicleCategoryEmissionExcelAsync(DateTime fromDate, DateTime toDate)
        {
            var data = await GetVehicleCategoryWiseEmissionAsync(fromDate, toDate);

            if (!data.Labels.Any())
                return Array.Empty<byte>();

            var categories = data.Labels;
            var distanceVals = data.DistanceData.Select(d => (double)d).ToList();
            var emissionVals = data.EmissionData.Select(e => (double)e).ToList();

            return await ExcelExportHelper.ExportVehicleCategoryComboChartAsync(
                categories,
                distanceVals,
                emissionVals,
                "Category Report",
                $"Vehicle Category Wise Distance & Emission - {fromDate:yyyy-MM-dd}_to_{toDate:yyyy-MM-dd}"
            );
        }

      
         //Builds an ordered list of (year, month, label) tuples covering every
         //month from fromDate to toDate, inclusive. Used for all monthly charts.
 
        private static List<(int Year, int Month, string Label)> BuildMonthSlots(DateTime from, DateTime to)
        {
            var slots = new List<(int, int, string)>();
            var cursor = new DateTime(from.Year, from.Month, 1);
            var end = new DateTime(to.Year, to.Month, 1);

            while (cursor <= end)
            {
                slots.Add((cursor.Year, cursor.Month,
                           cursor.ToString("MMM yy"))); // e.g. "Apr 24"
                cursor = cursor.AddMonths(1);
            }
            return slots;
        }
    }
}