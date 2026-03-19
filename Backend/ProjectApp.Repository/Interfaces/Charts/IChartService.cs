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
        Task<List<FuelTypeMonthlyConsumptionDto>> GetVehicleFuelMonthlyConsumptionAsync(int year);
        Task<List<FuelTypeMonthlyConsumptionDto>> GetGeneratorFuelMonthlyConsumptionAsync(int year);

        Task<FuelCombinedChartResponseDto> GetCombinedFuelChartAsync(int year);
    }
}

