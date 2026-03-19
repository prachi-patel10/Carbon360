using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Charts;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Charts;

namespace ProjectApp.Repository.Services.Charts
{
    public class ChartService : IChartService
    {
        private readonly CBContext _context;

        private static readonly string[] _colors = {
            "#378ADD", "#1D9E75", "#EF9F27", "#D4537E",
            "#534AB7", "#D85A30", "#0891B2", "#65A30D"
        };

        private static readonly string[] _monthNames = {
            "Jan","Feb","Mar","Apr","May","Jun",
            "Jul","Aug","Sep","Oct","Nov","Dec"
        };

        // ✅ FIX 1: Only ONE constructor — removed the duplicate
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
            var vehicleTask = GetVehicleFuelMonthlyConsumptionAsync(year);
            var generatorTask = GetGeneratorFuelMonthlyConsumptionAsync(year);
            await Task.WhenAll(vehicleTask, generatorTask);

            var labels = _monthNames.ToList();

            return new FuelCombinedChartResponseDto
            {
                Labels = labels,
                VehicleDatasets = BuildDatasets(await vehicleTask, labels),
                GeneratorDatasets = BuildDatasets(await generatorTask, labels)
            };
        }

        private List<FuelStackDataset> BuildDatasets(
            List<FuelTypeMonthlyConsumptionDto> rows, List<string> labels)
        {
            var fuelTypes = rows.Select(r => r.FuelType).Distinct().OrderBy(f => f).ToList();
            int colorIdx = 0;

            return fuelTypes.Select(fuel => new FuelStackDataset
            {
                FuelType = fuel,
                Color = _colors[colorIdx++ % _colors.Length],

                // ✅ FIX 2: Match index (i+1) to MonthNumber property name in DTO
                Data = Enumerable.Range(1, 12).Select(monthNum =>
                {
                    var row = rows.FirstOrDefault(
                        r => r.FuelType == fuel && r.MonthNumber == monthNum);
                    return row?.TotalFuelConsumed ?? 0m;
                }).ToList()

            }).ToList();
        }
    }
}