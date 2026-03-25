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
        //fuel consumption
        Task<List<FuelTypeMonthlyConsumptionDto>> GetVehicleFuelMonthlyConsumptionAsync(int year);
        Task<List<FuelTypeMonthlyConsumptionDto>> GetGeneratorFuelMonthlyConsumptionAsync(int year);
        Task<FuelCombinedChartResponseDto> GetCombinedFuelChartAsync(int year);

        // separate emission charts
        Task<MonthlyEmissionChartResponseDto> GetVehicleEmissionChartAsync(int year);
        Task<MonthlyEmissionChartResponseDto> GetGeneratorEmissionChartAsync(int year);

        // Generator Run Hours Pie Chart 
        Task<GeneratorRunHoursChartResponseDto> GetGeneratorRunHoursByBaseAsync(int year);
        Task<GeneratorLoadFactorChartResponseDto> GetGeneratorLoadFactorMonthlyAsync(int year);

        // Vehicle Total Distance Monthly Bar Chart
        Task<VehicleDistanceChartResponseDto> GetVehicleTotalDistanceMonthlyAsync(int year);

        //VehicleTypeWise vs Distance
        Task<VehicleTypeDistancePivotDto> GetVehicleTypeWiseDistanceAsync(int year);

        //Total CO2e, CO2, NO2, CH4
        Task<DashboardSummaryDto> GetDashboardSummaryAsync(int year);

        //Piechart for GeneratorRunHours
        Task<GeneratorRunHoursMonthlyPivotDto> GetGeneratorRunHoursMonthlyAsync(int year);

        // Vehicle City‑wise Emissions (stacked bar)
        Task<List<CityEmissionDto>> GetVehicleCityWiseEmissionsAsync(int year);

        // Generator Site‑wise Emissions (stacked column)
        Task<List<SiteEmissionDto>> GetGeneratorSiteWiseEmissionsAsync(int year);
    }
}


