using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Charts;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Charts;

namespace ProjectApp.Repository.Services.Charts
{
    public class ChartService : IChartService
    {
        private readonly CBContext _context;

        // ── Fuel type colors ──────────────────────────────────────
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

        // ── Pie chart colors ──────────────────────────────────────
        private static readonly string[] _pieColors =
        {
            "#378ADD", "#1D9E75", "#EF9F27", "#D4537E",
            "#534AB7", "#D85A30", "#06b6d4", "#8b5cf6",
            "#ec4899", "#14b8a6", "#f97316", "#84cc16"
        };

        // ── Line chart colors (load factor, etc.) ─────────────────
        private static readonly string[] _lineColors =
        {
            "#378ADD", "#1D9E75", "#EF9F27", "#D4537E",
            "#534AB7", "#D85A30", "#06b6d4", "#8b5cf6",
            "#ec4899", "#14b8a6", "#f97316", "#84cc16"
        };

        private static readonly string[] _monthNames =
            { "Jan","Feb","Mar","Apr","May","Jun",
              "Jul","Aug","Sep","Oct","Nov","Dec" };

        // ── Emission colors ───────────────────────────────────────
        private static readonly Dictionary<string, string> _emissionColors = new()
        {
            { "Total", "#378ADD" },
            { "CO2",   "#1D9E75" },
            { "NO2",   "#EF9F27" },
            { "CH4",   "#D4537E" },
        };

        public ChartService(CBContext context)
        {
            _context = context;
        }

        // ── Shared emission builder ───────────────────────────────
        private MonthlyEmissionChartResponseDto BuildEmissionChart(List<MonthlyEmissionRawDto> rawRows)
        {
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
                    new EmissionLineDataset { Label = "Total CO2e (kg)", EmissionType = "Total", Color = _emissionColors["Total"], Data = Monthly(r => r.TotalEmission) },
                    new EmissionLineDataset { Label = "CO2 (kg)",        EmissionType = "CO2",   Color = _emissionColors["CO2"],   Data = Monthly(r => r.TotalCO2)      },
                    new EmissionLineDataset { Label = "NO2 (kg)",        EmissionType = "NO2",   Color = _emissionColors["NO2"],   Data = Monthly(r => r.TotalNO2)      },
                    new EmissionLineDataset { Label = "CH4 (kg)",        EmissionType = "CH4",   Color = _emissionColors["CH4"],   Data = Monthly(r => r.TotalCH4)      },
                }
            };
        }

        // ── Vehicle fuel monthly ──────────────────────────────────
        public async Task<List<FuelTypeMonthlyConsumptionDto>> GetVehicleFuelMonthlyConsumptionAsync(int year)
            => await _context.Set<FuelTypeMonthlyConsumptionDto>()
                .FromSqlInterpolated($"EXEC USP_CB_VehicleFuelMonthlyConsumption {year}")
                .ToListAsync();

        // ── Generator fuel monthly ────────────────────────────────
        public async Task<List<FuelTypeMonthlyConsumptionDto>> GetGeneratorFuelMonthlyConsumptionAsync(int year)
            => await _context.Set<FuelTypeMonthlyConsumptionDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorFuelMonthlyConsumption {year}")
                .ToListAsync();

        // ── Combined fuel chart ───────────────────────────────────
        public async Task<FuelCombinedChartResponseDto> GetCombinedFuelChartAsync(int year)
        {
            var allRows = await _context.Set<FuelTypeMonthlyConsumptionDto>()
                .FromSqlInterpolated($"EXEC USP_CB_CombinedFuelMonthlyConsumption {year}")
                .ToListAsync();

            var labels = _monthNames.ToList();
            var groups = allRows
                .Select(r => new { r.FuelType, r.Source })
                .Distinct()
                .OrderBy(g => g.FuelType).ThenBy(g => g.Source)
                .ToList();

            var datasets = groups.Select(g =>
            {
                var baseColor = _fuelColors.ContainsKey(g.FuelType) ? _fuelColors[g.FuelType] : _defaultColor;
                var color = g.Source == "Vehicle" ? baseColor : baseColor + "80";
                return new FuelStackDataset
                {
                    Label = $"{g.FuelType} ({g.Source})",
                    FuelType = g.FuelType,
                    Source = g.Source,
                    Color = color,
                    Data = Enumerable.Range(1, 12).Select(monthNum =>
                    {
                        var row = allRows.FirstOrDefault(r =>
                            r.FuelType == g.FuelType &&
                            r.Source == g.Source &&
                            r.MonthNumber == monthNum);
                        return row?.TotalFuelConsumed ?? 0m;
                    }).ToList()
                };
            }).ToList();

            return new FuelCombinedChartResponseDto { Labels = labels, Datasets = datasets };
        }

        // ── Vehicle emission chart ────────────────────────────────
        public async Task<MonthlyEmissionChartResponseDto> GetVehicleEmissionChartAsync(int year)
        {
            var rows = await _context.Set<MonthlyEmissionRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_VehicleEmissionMonthlyChart {year}")
                .ToListAsync();
            return BuildEmissionChart(rows);
        }

        // ── Generator emission chart ──────────────────────────────
        public async Task<MonthlyEmissionChartResponseDto> GetGeneratorEmissionChartAsync(int year)
        {
            var rows = await _context.Set<MonthlyEmissionRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorEmissionMonthlyChart {year}")
                .ToListAsync();
            return BuildEmissionChart(rows);
        }

        // ── Generator Run Hours by Base (Pie Chart) ───────────────
        public async Task<GeneratorRunHoursChartResponseDto> GetGeneratorRunHoursByBaseAsync(int year)
        {
            var rows = await _context.Set<GeneratorRunHoursRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorRunHoursByBase {year}")
                .ToListAsync();

            var colors = rows
                .Select((_, i) => _pieColors[i % _pieColors.Length])
                .ToList();

            return new GeneratorRunHoursChartResponseDto
            {
                Labels = rows.Select(r => r.GeneratorName).ToList(),
                Data = rows.Select(r => r.TotalRunHours).ToList(),
                Colors = colors,
                SiteNames = rows.Select(r => r.SiteName ?? "-").ToList(),
                FuelConsumed = rows.Select(r => r.TotalFuelConsumed).ToList(),
                PowerOutput = rows.Select(r => r.TotalPowerOutputKWH).ToList(),
            };
        }

        // ── Vehicle Total Distance Monthly (Bar Chart) ────────────
        public async Task<VehicleDistanceChartResponseDto> GetVehicleTotalDistanceMonthlyAsync(int year)
        {
            var rows = await _context.Set<VehicleDistanceMonthlyRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_VehicleTotalDistanceMonthly {year}")
                .ToListAsync();

            var distance = new List<decimal>(new decimal[12]);
            var trips = new List<int>(new int[12]);
            var fuel = new List<decimal>(new decimal[12]);

            foreach (var row in rows)
            {
                var idx = row.MonthNumber - 1;
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

        // ── Generator Load Factor Monthly (Line Chart) ────────────
        public async Task<GeneratorLoadFactorChartResponseDto> GetGeneratorLoadFactorMonthlyAsync(int year)
        {
            var rows = await _context.Set<GeneratorLoadFactorRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorLoadFactorMonthly {year}")
                .ToListAsync();

            var generators = rows
                .Select(r => r.GeneratorName)
                .Distinct()
                .OrderBy(n => n)
                .ToList();

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

    }   // ← class closing brace
}       // ← namespace closing brace