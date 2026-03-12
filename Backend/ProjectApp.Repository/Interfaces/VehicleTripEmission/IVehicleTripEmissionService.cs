using ProjectApp.Core.DTOs.Account.VehicleTripEmission;
using ProjectApp.Repository.Utilities.SP;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.VehicleTripEmission
{
    public interface IVehicleTripEmissionService
    {
        Task<ResponseVehicleTripEmissionDTO> CreateAsync(CreateVehicleTripEmissionDTO dto);
        Task<List<ResponseVehicleTripEmissionDTO>> GetAllAsync();
        Task<ResponseVehicleTripEmissionDTO> GetByHashIdAsync(string hashId);
        Task<bool> DeleteAsync(string hashId);
        Task<ResponseVehicleTripEmissionDTO> UpdateAsync(UpdateVehicleTripEmissionDTO dto);

        Task<bool> UpdateStatusAsync(VehicleTripStatusUpdateDTO dto);

        //    Task<(IEnumerable<SearchVehicleTripEmissionDTO>, int)> SearchVehicleTrips(
        //    string search,string vehicleNumber,string fuelType,string vehicleType,
        //    DateTime? startDate,
        //    DateTime? endDate,
        //    int? statusId,
        //    string userRole,
        //   int pageNumber = 1,
        //int pageSize = 10);

        Task<(IEnumerable<SearchVehicleTripEmissionDTO>, int)> SearchVehicleTrips(
        string? search,
        string? vehicleNumber,
        string? fuelType,
        string? vehicleType,
        DateTime? startDate,
        DateTime? endDate,
        int? statusId,
        string? userRole,
        int pageNumber = 1,
        int pageSize = 10,
        string sortColumn = "tripstartdatetime",
        string sortDirection = "DESC");

        //Task<PageResult> GetMyActionTripsAsync(int pageNumber, int pageSize);
        Task<PageResult> GetMyActionTripsAsync(int pageNumber, int pageSize, string sortColumn = "tripStartDateTime", string sortDirection = "DESC");
    }


}
