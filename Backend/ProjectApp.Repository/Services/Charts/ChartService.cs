using Microsoft.EntityFrameworkCore;
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
        private MonthlyEmissionChartResponseDto BuildEmissionChart(List<MonthlyEmissionRawDto> rawRows)
        {
            // Helper: build 12-element array filling 0 for missing months
            List<decimal> Monthly(Func<MonthlyEmissionRawDto, decimal> selector) =>
                Enumerable.Range(1, 12).Select(m =>
                {
                    var row = rawRows.FirstOrDefault(r => r.MonthNumber == m);
                    return row != null ? selector(row) : 0m;
                }).ToList();

            return new MonthlyEmissionChartResponseDto
            {
                Labels = _monthNames.ToList(),
                Datasets = new List<EmissionLineDataset>
                {
                    new EmissionLineDataset
                    {
                        Label        = "Total CO2e (kg)",
                        EmissionType = "Total",
                        Color        = _emissionColors["Total"],
                        Data         = Monthly(r => r.TotalEmission)
                    },
                    new EmissionLineDataset
                    {
                        Label        = "CO2 (kg)",
                        EmissionType = "CO2",
                        Color        = _emissionColors["CO2"],
                        Data         = Monthly(r => r.TotalCO2)
                    },
                    new EmissionLineDataset
                    {
                        Label        = "NO2 (kg)",
                        EmissionType = "NO2",
                        Color        = _emissionColors["NO2"],
                        Data         = Monthly(r => r.TotalNO2)
                    },
                    new EmissionLineDataset
                    {
                        Label        = "CH4 (kg)",
                        EmissionType = "CH4",
                        Color        = _emissionColors["CH4"],
                        Data         = Monthly(r => r.TotalCH4)
                    },
                }
            };
        }

        // ─────────────────────────────────────────────────────────────────
        // FUEL CONSUMPTION
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// GET /api/Chart/VehicleMonthly
        /// SP : USP_CB_VehicleFuelMonthlyConsumption
        /// Returns fuel consumption per fuel type per month for vehicles.
        /// Columns: FuelType, Source='Vehicle', MonthNumber, MonthName, TotalFuelConsumed
        /// </summary>
        public async Task<List<FuelTypeMonthlyConsumptionDto>> GetVehicleFuelMonthlyConsumptionAsync(int year)
            => await _context.Set<FuelTypeMonthlyConsumptionDto>()
                .FromSqlInterpolated($"EXEC USP_CB_VehicleFuelMonthlyConsumption {year}")
                .ToListAsync();

        /// <summary>
        /// GET /api/Chart/GeneratorMonthly
        /// SP : USP_CB_GeneratorFuelMonthlyConsumption
        /// Returns fuel consumption per fuel type per month for generators.
        /// Columns: FuelType, Source='Generator', MonthNumber, MonthName, TotalFuelConsumed
        /// </summary>
        public async Task<List<FuelTypeMonthlyConsumptionDto>> GetGeneratorFuelMonthlyConsumptionAsync(int year)
            => await _context.Set<FuelTypeMonthlyConsumptionDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorFuelMonthlyConsumption {year}")
                .ToListAsync();

        /// <summary>
        /// GET /api/Chart/CombinedFuelChart
        /// SP : USP_CB_CombinedFuelMonthlyConsumption
        /// Combines vehicle + generator fuel consumption into a stacked bar chart.
        /// Solid color = Vehicle, 50% transparent (hex + "80") = Generator.
        /// </summary>
        public async Task<FuelCombinedChartResponseDto> GetCombinedFuelChartAsync(int year)
        {
            var allRows = await _context.Set<FuelTypeMonthlyConsumptionDto>()
                .FromSqlInterpolated($"EXEC USP_CB_CombinedFuelMonthlyConsumption {year}")
                .ToListAsync();

            var groups = allRows
                .Select(r => new { r.FuelType, r.Source })
                .Distinct()
                .OrderBy(g => g.FuelType)
                .ThenBy(g => g.Source)
                .ToList();

            var datasets = groups.Select(g =>
            {
                var baseColor = _fuelColors.ContainsKey(g.FuelType) ? _fuelColors[g.FuelType] : _defaultColor;
                // Vehicle = solid color, Generator = semi-transparent (append "80" = 50% alpha)
                var color = g.Source == "Vehicle" ? baseColor : baseColor + "80";

                return new FuelStackDataset
                {
                    Label = $"{g.FuelType} ({g.Source})",
                    FuelType = g.FuelType,
                    Source = g.Source,
                    Color = color,
                    Data = Enumerable.Range(1, 12).Select(m =>
                        allRows.FirstOrDefault(r =>
                            r.FuelType == g.FuelType &&
                            r.Source == g.Source &&
                            r.MonthNumber == m)
                        ?.TotalFuelConsumed ?? 0m
                    ).ToList()
                };
            }).ToList();

            return new FuelCombinedChartResponseDto
            {
                Labels = _monthNames.ToList(),
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
        public async Task<MonthlyEmissionChartResponseDto> GetVehicleEmissionChartAsync(int year)
        {
            var rows = await _context.Set<MonthlyEmissionRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_VehicleEmissionMonthlyChart {year}")
                .ToListAsync();
            return BuildEmissionChart(rows);
        }

        /// <summary>
        /// GET /api/Chart/GeneratorEmissionChart
        /// SP : USP_CB_GeneratorEmissionMonthlyChart
        /// 4 line datasets (TotalCO2e, CO2, NO2, CH4) per month for generators.
        /// Columns: MonthNumber, TotalCO2, TotalNO2, TotalCH4, TotalEmission
        /// </summary>
        public async Task<MonthlyEmissionChartResponseDto> GetGeneratorEmissionChartAsync(int year)
        {
            var rows = await _context.Set<MonthlyEmissionRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorEmissionMonthlyChart {year}")
                .ToListAsync();
            return BuildEmissionChart(rows);
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
        public async Task<GeneratorRunHoursChartResponseDto> GetGeneratorRunHoursByBaseAsync(int year)
        {
            var rows = await _context.Set<GeneratorRunHoursRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorRunHoursByBase {year}")
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
        public async Task<GeneratorRunHoursMonthlyPivotDto> GetGeneratorRunHoursMonthlyAsync(int year)
        {
            var rows = await _context.Set<GeneratorRunHoursMonthlyRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorRunHoursMonthly {year}")
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

            // Column totals — sum of each generator across all 12 months
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
        public async Task<GeneratorLoadFactorChartResponseDto> GetGeneratorLoadFactorMonthlyAsync(int year)
        {
            var rows = await _context.Set<GeneratorLoadFactorRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorLoadFactorMonthly {year}")
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
        public async Task<VehicleDistanceChartResponseDto> GetVehicleTotalDistanceMonthlyAsync(int year)
        {
            var rows = await _context.Set<VehicleDistanceMonthlyRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_VehicleTotalDistanceMonthly {year}")
                .ToListAsync();

            // Pre-fill 12 slots with zeros; overwrite with actual data
            var distance = new List<decimal>(new decimal[12]);
            var trips = new List<int>(new int[12]);
            var fuel = new List<decimal>(new decimal[12]);

            foreach (var row in rows)
            {
                int idx = row.MonthNumber - 1;
                distance[idx] = row.TotalDistanceKM;
                trips[idx] = row.TotalTrips;
                fuel[idx] = row.TotalFuelConsumed;
            }

            return new VehicleDistanceChartResponseDto
            {
                Labels = _monthNames.ToList(),
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
        public async Task<VehicleTypeDistancePivotDto> GetVehicleTypeWiseDistanceAsync(int year)
        {
            var rows = await _context.Set<VehicleTypeDistanceRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_VehicleTypeWiseDistance {year}")
                .ToListAsync();

            var vehicleTypes = rows.Select(r => r.VehicleTypeName).Distinct().OrderBy(n => n).ToList();
            var colors = vehicleTypes.Select((_, i) => _vehicleTypeColors[i % _vehicleTypeColors.Length]).ToList();

            var distMatrix = new List<List<decimal>>();
            var tripsMatrix = new List<List<int>>();
            var fuelMatrix = new List<List<decimal>>();
            var monthTotals = new List<decimal>();

            for (int m = 1; m <= 12; m++)
            {
                var distRow = new List<decimal>();
                var tripsRow = new List<int>();
                var fuelRow = new List<decimal>();

                foreach (var vt in vehicleTypes)
                {
                    var cell = rows.FirstOrDefault(r => r.MonthNumber == m && r.VehicleTypeName == vt);
                    distRow.Add(cell?.TotalDistanceKM ?? 0m);
                    tripsRow.Add(cell?.TotalTrips ?? 0);
                    fuelRow.Add(cell?.TotalFuelConsumed ?? 0m);
                }

                distMatrix.Add(distRow);
                tripsMatrix.Add(tripsRow);
                fuelMatrix.Add(fuelRow);
                monthTotals.Add(distRow.Sum());
            }

            // Column totals — sum each vehicle type across 12 months
            var typeTotals = vehicleTypes
                .Select((_, ti) => distMatrix.Sum(row => row[ti]))
                .ToList();

            return new VehicleTypeDistancePivotDto
            {
                MonthLabels = _monthNames.ToList(),
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
        public async Task<List<CityEmissionDto>> GetVehicleCityWiseEmissionsAsync(int year)
            => await _context.Set<CityEmissionDto>()
                .FromSqlInterpolated($"EXEC USP_CB_VehicleCityWiseEmissions {year}")
                .ToListAsync();

        /// <summary>
        /// GET /api/Chart/GeneratorSiteEmissions
        /// SP : USP_CB_GeneratorSiteWiseEmissions
        /// Bar / donut chart — generator emissions grouped by site location.
        /// Columns: SiteName, TotalCO2, TotalNO2, TotalCH4, TotalCO2e
        /// </summary>
        public async Task<List<SiteEmissionDto>> GetGeneratorSiteWiseEmissionsAsync(int year)
            => await _context.Set<SiteEmissionDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorSiteWiseEmissions {year}")
                .ToListAsync();

        // ─────────────────────────────────────────────────────────────────
        // DASHBOARD SUMMARIES
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// GET /api/Chart/VehicleSummary
        /// SP : USP_CB_VehicleSummary
        /// KPI cards — vehicle totals for the year (CO2e, fuel, distance, trips).
        /// </summary>
        public async Task<VehicleSummaryDto> GetVehicleSummaryAsync(int year)
        {
            var result = await _context.Set<VehicleSummaryDto>()
                .FromSqlInterpolated($"EXEC USP_CB_VehicleSummary {year}")
                .ToListAsync();
            return result.FirstOrDefault() ?? new VehicleSummaryDto();
        }

        /// <summary>
        /// GET /api/Chart/GeneratorSummary
        /// SP : USP_CB_GeneratorSummary
        /// KPI cards — generator totals for the year (CO2e, fuel, run hours, power).
        /// </summary>
        public async Task<GeneratorSummaryDto> GetGeneratorSummaryAsync(int year)
        {
            var result = await _context.Set<GeneratorSummaryDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorSummary {year}")
                .ToListAsync();
            return result.FirstOrDefault() ?? new GeneratorSummaryDto();
        }

        /// <summary>
        /// SP : USP_CB_DashboardEmissionSummary
        /// Combined vehicle + generator KPI summary (single row result).
        /// Columns: TotalCO2e, TotalCO2, TotalCH4, TotalNO2, TotalFuelConsumed, TotalDistanceKM
        /// Note: expose via a dedicated controller endpoint if needed.
        /// </summary>
        public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(int year)
        {
            var result = await _context.Set<DashboardSummaryDto>()
                .FromSqlInterpolated($"EXEC USP_CB_DashboardEmissionSummary {year}")
                .ToListAsync();
            return result.FirstOrDefault() ?? new DashboardSummaryDto();
        }

        public async Task<byte[]> ExportVehicleFuelExcelAsync(int year)
        {
            var data = await GetVehicleFuelMonthlyConsumptionAsync(year);

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

            //var rows = data
            //.GroupBy(x => x.MonthNumber)
            //.Select(g => new VehicleFuelExportDto
            //{
            //    Month = g.First().MonthName,

            //    Diesel = g.Where(x => x.FuelType == "Diesel")
            //              .Sum(x => x.TotalFuelConsumed),

            //    Petrol = g.Where(x => x.FuelType == "Petrol")
            //              .Sum(x => x.TotalFuelConsumed),

            //    CNG = g.Where(x => x.FuelType == "CNG")
            //           .Sum(x => x.TotalFuelConsumed),

            //    LPG = g.Where(x => x.FuelType == "LPG")
            //           .Sum(x => x.TotalFuelConsumed)
            //})
            //.ToList();

            //var rows = data.Select(x => new VehicleFuelExportDto
            //{
            //    Month = x.MonthName,
            //    Diesel = x.FuelType == "Diesel" ? x.TotalFuelConsumed : 0,
            //    Petrol = x.FuelType == "Petrol" ? x.TotalFuelConsumed : 0,
            //    CNG = x.FuelType == "CNG" ? x.TotalFuelConsumed : 0,
            //    LPG = x.FuelType == "LPG" ? x.TotalFuelConsumed : 0
            //}).ToList();

            //var rows = Enumerable.Range(1, 12).Select(m => new VehicleFuelExportDto
            //{
            //    Month = _monthNames[m - 1],

            //    Diesel = data
            //        .Where(x => x.MonthNumber == m && x.FuelType == "Diesel")
            //        .Sum(x => x.TotalFuelConsumed),

            //    Petrol = data
            //        .Where(x => x.MonthNumber == m && x.FuelType == "Petrol")
            //        .Sum(x => x.TotalFuelConsumed),

            //    CNG = data
            //        .Where(x => x.MonthNumber == m && x.FuelType == "CNG")
            //        .Sum(x => x.TotalFuelConsumed),

            //    LPG = data
            //        .Where(x => x.MonthNumber == m && x.FuelType == "LPG")
            //        .Sum(x => x.TotalFuelConsumed)
            //}).ToList();

            // ✅ IMPORTANT FIX
            var columns = new Dictionary<string, string>
            {
                { "Month", "Month" },
                { "Diesel", "Diesel" },
                { "Petrol", "Petrol" },
                { "CNG", "CNG" },
                { "LPG", "LPG" }
            };

                    return await ExcelExportHelper.ExportExcelWithChartAsync<VehicleFuelExportDto>(
                        rows,
                        columns,
                        "Fuel Report",
                        $"Vehicle Fuel Report - {year}"
                    );
        }


        public async Task<byte[]> ExportVehicleEmissionExcelAsync(int year)
        {
            var raw = await _context.Set<MonthlyEmissionRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_VehicleEmissionMonthlyChart {year}")
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
                $"Vehicle Emission Report - {year}"
            );
        }

        //public async Task<byte[]> ExportVehicleDistanceExcelAsync(int year)
        //{
        //    var data = await GetVehicleTotalDistanceMonthlyAsync(year);

        //    var rows = Enumerable.Range(1, 12).Select(m =>
        //    {
        //        int idx = m - 1;
        //        return new VehicleDistanceExportDto
        //        {
        //            Month = _monthNames[idx],
        //            DistanceKM = (double)data.DistanceData[idx],
        //            TripCount = data.TripData[idx],
        //            FuelConsumed = (double)data.FuelData[idx]
        //        };
        //    }).ToList();

        //    // ✅ Use COMBO chart method (Bar + Line)
        //    return await ExcelExportHelper.ExportExcelWithComboChartAsync(
        //        rows,
        //        "Distance Report",
        //        $"Vehicle Distance Report - {year}"
        //    );
        //}

        //public async Task<byte[]> ExportVehicleTypeDistanceExcelAsync(int year)
        //{
        //    var data = await GetVehicleTypeWiseDistanceAsync(year);

        //    //var rows = new List<dynamic>();
        //    var rows = new List<Dictionary<string, object>>(); 


        //    for (int mi = 0; mi < data.MonthLabels.Count; mi++)
        //    {
        //        var row = new Dictionary<string, object>();
        //        row["Month"] = data.MonthLabels[mi];

        //        for (int ti = 0; ti < data.VehicleTypes.Count; ti++)
        //        {
        //            row[data.VehicleTypes[ti]] = data.DistanceMatrix[mi][ti];
        //        }

        //        row["Total"] = data.MonthTotals[mi];

        //        rows.Add(row);
        //    }

        //    return await ExcelExportHelper.ExportDynamicPivotExcelWithChartAsync(
        //    rows,
        //    "Vehicle Type Distance",
        //    $"Vehicle Type Distance Report - {year}"
        //);
        //}

        //public async Task<byte[]> ExportVehicleTypeDistanceExcelPieChartAsync(int year)
        //{
        //    var pivot = await GetVehicleTypeWiseDistanceAsync(year);

        //    var rows = pivot.VehicleTypes.Select((vt, ti) => new VehicleTypeDistanceExportDto
        //    {
        //        VehicleType = vt,
        //        TotalDistanceKM = (double)pivot.TypeTotals[ti]
        //    }).ToList();

        //    // ✅ Now using REAL Pie Chart
        //    return await ExcelExportHelper.ExportExcelWithPieChartAsync(
        //        rows,
        //        "Vehicle Type Distance",
        //        $"Vehicle Type Distance Share - {year}"
        //    );
        //}
        //public async Task<byte[]> ExportVehicleTypeDistanceExcelPieChartAsync(int year)
        //{
        //    var pivot = await GetVehicleTypeWiseDistanceAsync(year);

        //    // AGGREGATE BY VEHICLE TYPE
        //    var aggregated = pivot.VehicleTypes.Select((vt, ti) => new VehicleTypeDistanceExportDto
        //    {
        //        VehicleType = vt,
        //        TotalDistanceKM = (double)pivot.TypeTotals[ti]  // already total per type
        //    }).ToList();

        //    return await ExcelExportHelper.ExportExcelWithPieChartAsync(
        //        aggregated,
        //        "Vehicle Type Distance",
        //        $"Vehicle Type Distance Share - {year}"
        //    );
        //}
    }
}