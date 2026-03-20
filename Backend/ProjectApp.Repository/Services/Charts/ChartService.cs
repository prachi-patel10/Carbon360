using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Charts;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Charts;

namespace ProjectApp.Repository.Services.Charts
{
    public class ChartService : IChartService
    {
        private readonly CBContext _context;

        // Base colors per fuel type — Vehicle gets solid, Generator gets lighter shade
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

        private static readonly string[] _monthNames =
            { "Jan","Feb","Mar","Apr","May","Jun",
          "Jul","Aug","Sep","Oct","Nov","Dec" };

        // Emission type colors — shared for both vehicle & generator charts
        private static readonly Dictionary<string, string> _emissionColors = new()
{
    { "Total", "#378ADD" },  // blue
    { "CO2",   "#1D9E75" },  // green
    { "NO2",   "#EF9F27" },  // amber
    { "CH4",   "#D4537E" },  // pink
};

        // ── shared private builder ─────────────────────────────────────────────────
        private MonthlyEmissionChartResponseDto BuildEmissionChart(
            List<MonthlyEmissionRawDto> rawRows)
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

        public ChartService(CBContext context)
        {
            _context = context;
        }

        public async Task<List<FuelTypeMonthlyConsumptionDto>> GetVehicleFuelMonthlyConsumptionAsync(int year)
            => await _context.Set<FuelTypeMonthlyConsumptionDto>()
                .FromSqlInterpolated($"EXEC USP_CB_VehicleFuelMonthlyConsumption {year}")
                .ToListAsync();

        public async Task<List<FuelTypeMonthlyConsumptionDto>> GetGeneratorFuelMonthlyConsumptionAsync(int year)
            => await _context.Set<FuelTypeMonthlyConsumptionDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorFuelMonthlyConsumption {year}")
                .ToListAsync();

        public async Task<FuelCombinedChartResponseDto> GetCombinedFuelChartAsync(int year)
        {
            // Single SP returns both vehicle + generator rows with Source column
            var allRows = await _context.Set<FuelTypeMonthlyConsumptionDto>()
                .FromSqlInterpolated($"EXEC USP_CB_CombinedFuelMonthlyConsumption {year}")
                .ToListAsync();

            var labels = _monthNames.ToList();

            // Get unique fuel+source combos e.g. Diesel-Vehicle, Diesel-Generator
            var groups = allRows
                .Select(r => new { r.FuelType, r.Source })
                .Distinct()
                .OrderBy(g => g.FuelType)
                .ThenBy(g => g.Source)
                .ToList();

            var datasets = groups.Select(g =>
            {
                var baseColor = _fuelColors.ContainsKey(g.FuelType)
                    ? _fuelColors[g.FuelType]
                    : _defaultColor;

                // Generator gets 60% opacity version of the same color
                var color = g.Source == "Vehicle"
                    ? baseColor
                    : baseColor + "80";  // hex opacity ~50%

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

            return new FuelCombinedChartResponseDto
            {
                Labels = labels,
                Datasets = datasets
            };
        }

        public async Task<MonthlyEmissionChartResponseDto> GetVehicleEmissionChartAsync(int year)
        {
            var rows = await _context.Set<MonthlyEmissionRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_VehicleEmissionMonthlyChart {year}")
                .ToListAsync();

            return BuildEmissionChart(rows);
        }

        public async Task<MonthlyEmissionChartResponseDto> GetGeneratorEmissionChartAsync(int year)
        {
            var rows = await _context.Set<MonthlyEmissionRawDto>()
                .FromSqlInterpolated($"EXEC USP_CB_GeneratorEmissionMonthlyChart {year}")
                .ToListAsync();

            return BuildEmissionChart(rows);
        }
    }
}