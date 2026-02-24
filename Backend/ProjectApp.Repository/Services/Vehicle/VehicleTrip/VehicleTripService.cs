using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Vehicle.VehicleTrip;
using ProjectApp.Repository.Services.Common;
using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;

namespace ProjectApp.Repository.Services.Vehicle.VehicleTrip
{
    public class VehicleTripService : CommonService<CB_VehicleTrip>, IVehicleTripService
    {
        private readonly CBContext _context;

        public VehicleTripService(CBContext context) : base(context)
        {
            _context = context;
        }

        // ---------- Existing CommonService methods ----------
        public async Task<List<CB_VehicleTrip>> GetTripsByVehicleIdAsync(int vehicleId)
        {
            return await GetAllData(x => x.VehicleId == vehicleId && !x.IsDeleted, true);
        }

        public async Task<List<CB_VehicleTrip>> GetTripsByDepartmentIdAsync(int departmentId)
        {
            return await GetQueryable()
                .Include(x => x.Vehicle)
                .Where(x => x.Vehicle != null &&
                            x.Vehicle.department_id == departmentId &&
                            !x.IsDeleted)
                .ToListAsync();
        }

        public async Task<List<CB_VehicleTrip>> GetTripsBetweenDatesAsync(DateTime fromDate, DateTime toDate)
        {
            return await GetAllData(x =>
                x.TripStartDateTime >= fromDate &&
                x.TripEndDateTime <= toDate &&
                !x.IsDeleted,
                true);
        }

        // ---------- SP based methods ----------
        public async Task<int> InsertTripUsingSPAsync(CB_VehicleTrip trip)
        {
            var parameters = new[]
            {
                new SqlParameter("@VehicleId", trip.VehicleId),
                new SqlParameter("@FromCityId", trip.FromCityId),
                new SqlParameter("@ToCityId", trip.ToCityId),
                new SqlParameter("@TripStartDateTime", trip.TripStartDateTime),
                new SqlParameter("@TripEndDateTime", trip.TripEndDateTime),
                new SqlParameter("@DistanceKm", trip.DistanceKm),
                new SqlParameter("@FuelConsumedLtr", trip.FuelConsumedLtr),
                new SqlParameter("@EntryBy", trip.EntryBy)
            };

            var newId = await _context.Database.ExecuteSqlRawAsync(
                "EXEC dbo.USP_CB_VehicleTripInsert @VehicleId, @FromCityId, @ToCityId, @TripStartDateTime, @TripEndDateTime, @DistanceKm, @FuelConsumedLtr, @EntryBy",
                parameters
            );

            return newId; // returns the inserted TripId
        }

        public async Task<bool> UpdateTripUsingSPAsync(CB_VehicleTrip trip)
        {
            var parameters = new[]
            {
                new SqlParameter("@TripId", trip.TripId),
                new SqlParameter("@VehicleId", trip.VehicleId),
                new SqlParameter("@FromCityId", trip.FromCityId),
                new SqlParameter("@ToCityId", trip.ToCityId),
                new SqlParameter("@TripStartDateTime", trip.TripStartDateTime),
                new SqlParameter("@TripEndDateTime", trip.TripEndDateTime),
                new SqlParameter("@DistanceKm", trip.DistanceKm),
                new SqlParameter("@FuelConsumedLtr", trip.FuelConsumedLtr),
                new SqlParameter("@UpdatedBy", trip.UpdatedBy ?? 0)
            };

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC dbo.USP_CB_VehicleTripUpdate @TripId, @VehicleId, @FromCityId, @ToCityId, @TripStartDateTime, @TripEndDateTime, @DistanceKm, @FuelConsumedLtr, @UpdatedBy",
                parameters
            );

            return true;
        }

        public async Task<bool> DeleteTripUsingSPAsync(int tripId, int updatedBy)
        {
            var parameters = new[]
            {
                new SqlParameter("@TripId", tripId),
                new SqlParameter("@UpdatedBy", updatedBy)
            };

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC dbo.USP_CB_VehicleTripDelete @TripId, @UpdatedBy",
                parameters
            );

            return true;
        }

        public async Task<CB_VehicleTrip> GetTripByIdUsingSPAsync(int tripId)
        {
            var parameter = new SqlParameter("@TripId", tripId);

            var trip = await _context.CB_VehicleTrips
                .FromSqlRaw("EXEC dbo.USP_CB_VehicleTripGetById @TripId", parameter)
                .AsNoTracking()
                .FirstOrDefaultAsync();

            return trip;
        }

        public async Task<List<CB_VehicleTrip>> GetAllTripsUsingSPAsync()
        {
            var trips = await _context.CB_VehicleTrips
                .FromSqlRaw("EXEC dbo.USP_CB_VehicleTripGetAll")
                .AsNoTracking()
                .ToListAsync();

            return trips;
        }
    }
}