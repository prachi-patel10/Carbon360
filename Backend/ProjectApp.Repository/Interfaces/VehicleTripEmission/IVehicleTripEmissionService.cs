using ProjectApp.Core.DTOs.Account.VehicleTripEmission;
using ProjectApp.Core.DTOs.Common;
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
        //Task<List<ResponseVehicleTripEmissionDTO>> GetAllAsync();
        Task<(List<ResponseVehicleTripEmissionDTO> Data, int TotalRecords)> GetAllAsync();
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
    List<string>? fuelType,
    List<string>? vehicleCategory,
    List<string>? vehicleType,
    DateTime? startDate,
    DateTime? endDate,
    DateTime? entryStartDate,
    DateTime? entryEndDate,
    int? statusId,
    string? userRole,
    int pageNumber = 1,
    int pageSize = 10,
    string sortColumn = "EntryDate",
    string sortDirection = "DESC");

        //Task<PageResult> GetMyActionTripsAsync(int pageNumber, int pageSize);
        Task<PageResult> GetMyActionTripsAsync(int pageNumber, int pageSize, string sortColumn = "EntryDate", string sortDirection = "ASC");

        Task<List<WorkflowActionDTO>> GetWorkflowActionsAsync(string encryptedId);

        Task<Dictionary<string, object>> GetByHashIdAsyncPDF(string hashId);

        Task<byte[]> ExportVehicleTripsExcel(
    string? search,
    List<string>? fuelType,
    List<string>? vehicleCategory,
    List<string>? vehicleType,
    DateTime? startDate,
    DateTime? endDate,
    DateTime? entryStartDate,
    DateTime? entryEndDate,
    string sortColumn,
    string sortDirection);

        Task<byte[]> GenerateVehicleTripPdf(string tripId);

        Task<List<CorporatePendingTripDTO>> GetCorporatePendingTripsAsync();


    }
}