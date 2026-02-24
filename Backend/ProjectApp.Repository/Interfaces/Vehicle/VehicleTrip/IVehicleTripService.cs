using ProjectApp.Repository.Interfaces.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Services.Masters.VehicleType;

namespace ProjectApp.Repository.Interfaces.Vehicle.VehicleTrip
{
    public interface IVehicleTripService : ICommonService<CB_VehicleTrip>
    {
        Task<List<CB_VehicleTrip>> GetTripsByVehicleIdAsync(int vehicleId);
        Task<List<CB_VehicleTrip>> GetTripsByDepartmentIdAsync(int departmentId);
        Task<List<CB_VehicleTrip>> GetTripsBetweenDatesAsync(DateTime fromDate, DateTime toDate);

        // SP based operations
        Task<int> InsertTripUsingSPAsync(CB_VehicleTrip trip);
        Task<bool> UpdateTripUsingSPAsync(CB_VehicleTrip trip);
        Task<bool> DeleteTripUsingSPAsync(int tripId, int updatedBy);
        Task<CB_VehicleTrip> GetTripByIdUsingSPAsync(int tripId);
        Task<List<CB_VehicleTrip>> GetAllTripsUsingSPAsync();
    }
}
