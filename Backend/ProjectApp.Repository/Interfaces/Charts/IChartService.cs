using ProjectApp.Core.DTOs.Charts;

namespace ProjectApp.Repository.Interfaces.Charts
{
    public interface IChartService
    {
        // ── Fuel consumption ─────────────────────────────────
        Task<List<FuelTypeMonthlyConsumptionDto>> GetVehicleFuelMonthlyConsumptionAsync(DateTime fromDate, DateTime toDate);
        Task<List<FuelTypeMonthlyConsumptionDto>> GetGeneratorFuelMonthlyConsumptionAsync(DateTime fromDate, DateTime toDate);
        Task<FuelCombinedChartResponseDto> GetCombinedFuelChartAsync(DateTime fromDate, DateTime toDate);
        // ── Emission charts ──────────────────────────────────
        Task<MonthlyEmissionChartResponseDto> GetVehicleEmissionChartAsync(DateTime fromDate, DateTime toDate);
        Task<MonthlyEmissionChartResponseDto> GetGeneratorEmissionChartAsync(DateTime fromDate, DateTime toDate);
        // ── Generator run hours ──────────────────────────────
        Task<GeneratorRunHoursChartResponseDto> GetGeneratorRunHoursByBaseAsync(DateTime fromDate, DateTime toDate);
        Task<GeneratorRunHoursMonthlyPivotDto> GetGeneratorRunHoursMonthlyAsync(DateTime fromDate, DateTime toDate);
        Task<GeneratorLoadFactorChartResponseDto> GetGeneratorLoadFactorMonthlyAsync(DateTime fromDate, DateTime toDate);
        // ── Vehicle distance ─────────────────────────────────
        Task<VehicleDistanceChartResponseDto> GetVehicleTotalDistanceMonthlyAsync(DateTime fromDate, DateTime toDate);
        Task<VehicleTypeDistancePivotDto> GetVehicleTypeWiseDistanceAsync(DateTime fromDate, DateTime toDate);
        // ── City / Site emissions ────────────────────────────
        Task<List<CityEmissionDto>> GetVehicleCityWiseEmissionsAsync(DateTime fromDate, DateTime toDate);
        Task<List<SiteEmissionDto>> GetGeneratorSiteWiseEmissionsAsync(DateTime fromDate, DateTime toDate);
        // ── Dashboard summaries ──────────────────────────────
        Task<VehicleSummaryDto> GetVehicleSummaryAsync(DateTime fromDate, DateTime toDate);     
        Task<GeneratorSummaryDto> GetGeneratorSummaryAsync(DateTime fromDate, DateTime toDate);
        // ── Exports ──────────────────────────────────────────
        Task<byte[]> ExportVehicleFuelExcelAsync(DateTime fromDate, DateTime toDate);
        Task<byte[]> ExportVehicleEmissionExcelAsync(DateTime fromDate, DateTime toDate);
        Task<byte[]> ExportVehicleDistanceExcelAsync(DateTime fromDate, DateTime toDate);
        Task<byte[]> ExportVehicleTypeDistanceExcelAsync(DateTime fromDate, DateTime toDate);
        Task<byte[]> ExportVehicleTypeDistancePieExcelAsync(DateTime fromDate, DateTime toDate);
        Task<byte[]> ExportCityWiseEmissionExcelAsync(DateTime fromDate, DateTime toDate);
        // ── Vehicle category wise ────────────────────────────
        Task<VehicleCategoryChartResponseDto> GetVehicleCategoryWiseEmissionAsync(DateTime fromDate, DateTime toDate);
        //Task<byte[]> ExportVehicleCategoryEmissionExcelAsync(int year);
        Task<byte[]> ExportVehicleCategoryEmissionExcelAsync(DateTime fromDate, DateTime toDate);
        //--------Export Generator ----------------

        Task<byte[]> ExportCityWiseEmissionExcelGeneratorAsync(DateTime fromDate, DateTime toDate);

        Task<byte[]> ExportGeneratorEmissionExcelLineChartAsync(DateTime fromDate, DateTime toDate);

        Task<byte[]> ExportGeneratorRunHoursMonthlyExcelAsync(DateTime fromDate, DateTime toDate);

        Task<byte[]> ExportGeneratorRunHoursPieChartAsync(DateTime fromDate, DateTime toDate);
        Task<byte[]> ExportSiteEmissionChartAsync(DateTime fromDate, DateTime toDate);

    }
}