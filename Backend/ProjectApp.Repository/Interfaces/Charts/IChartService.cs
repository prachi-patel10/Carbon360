using ProjectApp.Core.DTOs.Charts;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.Charts
{
    public interface IChartService
    {
        // ── Fuel consumption ─────────────────────────────────
        Task<List<FuelTypeMonthlyConsumptionDto>> GetVehicleFuelMonthlyConsumptionAsync(int year);
        Task<List<FuelTypeMonthlyConsumptionDto>> GetGeneratorFuelMonthlyConsumptionAsync(int year);
        Task<FuelCombinedChartResponseDto> GetCombinedFuelChartAsync(int year);

        // ── Emission charts ──────────────────────────────────
        Task<MonthlyEmissionChartResponseDto> GetVehicleEmissionChartAsync(int year);
        Task<MonthlyEmissionChartResponseDto> GetGeneratorEmissionChartAsync(int year);

        // ── Generator run hours ──────────────────────────────
        Task<GeneratorRunHoursChartResponseDto> GetGeneratorRunHoursByBaseAsync(int year);
        Task<GeneratorRunHoursMonthlyPivotDto> GetGeneratorRunHoursMonthlyAsync(int year);
        Task<GeneratorLoadFactorChartResponseDto> GetGeneratorLoadFactorMonthlyAsync(int year);

        // ── Vehicle distance ─────────────────────────────────
        Task<VehicleDistanceChartResponseDto> GetVehicleTotalDistanceMonthlyAsync(int year);
        Task<VehicleTypeDistancePivotDto> GetVehicleTypeWiseDistanceAsync(int year);

        // ── City / Site emissions ────────────────────────────
        Task<List<CityEmissionDto>> GetVehicleCityWiseEmissionsAsync(int year);
        Task<List<SiteEmissionDto>> GetGeneratorSiteWiseEmissionsAsync(int year);

        // ── Dashboard summaries ──────────────────────────────
        Task<VehicleSummaryDto> GetVehicleSummaryAsync(int year);
        Task<GeneratorSummaryDto> GetGeneratorSummaryAsync(int year);
        Task<DashboardSummaryDto> GetDashboardSummaryAsync(int year);  // ← added

        Task<byte[]> ExportVehicleFuelExcelAsync(int year);

        Task<byte[]> ExportVehicleEmissionExcelAsync(int year);

        Task<byte[]> ExportVehicleDistanceExcelAsync(int year);

        Task<byte[]> ExportVehicleTypeDistanceExcelAsync(int year);

        Task<byte[]> ExportVehicleTypeDistancePieExcelAsync(int year);

        Task<byte[]> ExportCityWiseEmissionExcelAsync(int year);
    }
}