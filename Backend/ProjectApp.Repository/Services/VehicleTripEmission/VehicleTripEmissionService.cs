using AutoMapper;
using HashidsNet;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Account.VehicleTripEmission;
using ProjectApp.Core.DTOs.Masters.VehicleType;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Interfaces.VehicleTripEmission;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Utilities.Auth;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.VehicleTripEmission
{
    public class VehicleTripEmissionService : BaseService<CB_VehicleTripEmission>, IVehicleTripEmissionService
    {
        private readonly CBContext _context;
        private readonly IdEncoder _idEncoder;

        public VehicleTripEmissionService(
            ICommonService<CB_VehicleTripEmission> commonService,
            IMapper mapper,
            IUserContext userContext,
            CBContext context,
            IdEncoder idEncoder)
            : base(commonService, mapper, userContext)
        {
            _context = context;
            _idEncoder = idEncoder;
        }

        public async Task<bool> DeleteAsync(string hashId)
        {
            int tripId = _idEncoder.Decode(hashId);
            int userId = GetCurrentUserId();

            var parameters = new[]
            {
        new SqlParameter("@TripId", tripId),
        new SqlParameter("@UserId", userId)
    };

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_VehicleTripEmission_Delete @TripId,@UserId",
                parameters);

            return true;
        }

        public async Task<ResponseVehicleTripEmissionDTO> UpdateAsync(UpdateVehicleTripEmissionDTO dto)
        {
            int userId = GetCurrentUserId();

            int tripId = _idEncoder.Decode(dto.TripId);
            int vehicleId = _idEncoder.Decode(dto.VehicleId);
            int fromCityId = _idEncoder.Decode(dto.FromCityId);
            int toCityId = _idEncoder.Decode(dto.ToCityId);

            var parameters = new[]
            {
        new SqlParameter("@TripId", tripId),
        new SqlParameter("@VehicleId", vehicleId),
        new SqlParameter("@FromCityId", fromCityId),
        new SqlParameter("@ToCityId", toCityId),
        new SqlParameter("@TripStartDateTime", dto.TripStartDateTime),
        new SqlParameter("@TripEndDateTime", dto.TripEndDateTime ?? (object)DBNull.Value),
        new SqlParameter("@DistanceKm", dto.DistanceKm),
        new SqlParameter("@FuelConsumedLtr", dto.FuelConsumedLtr),
        new SqlParameter("@UserId", userId)
    };

            var result = await _context.CB_VehicleTripEmissions
                .FromSqlRaw(
                    "EXEC USP_CB_UpdateVehicleTripEmission  " +
                    "@TripId,@VehicleId,@FromCityId,@ToCityId,@TripStartDateTime," +
                    "@TripEndDateTime,@DistanceKm,@FuelConsumedLtr,@UserId",
                    parameters)
                .ToListAsync();

            var entity = result.FirstOrDefault();

            return new ResponseVehicleTripEmissionDTO
            {
                TripId = dto.TripId,
                VehicleId = _idEncoder.Encode(entity.vehicleid),
                FromCityId = _idEncoder.Encode(entity.fromcityid),
                ToCityId = _idEncoder.Encode(entity.tocityid),
                TripStartDateTime = entity.tripstartdatetime,
                TripEndDateTime = entity.tripenddatetime,
                DistanceKm = entity.distancekm,
                FuelConsumedLtr = entity.fuelconsumedltr,
                CO2 = entity.co2,
                NO2 = entity.no2,
                CH4 = entity.ch4,
                TotalEmission = entity.totalemission,
                StatusId = entity.StatusId
            };
        }

        public async Task<bool> UpdateStatusAsync(VehicleTripStatusUpdateDTO dto)
        {
            int tripId = _idEncoder.Decode(dto.TripId);
            int userId = GetCurrentUserId();

            var parameters = new[]
            {
        new SqlParameter("@TripId", tripId),
        new SqlParameter("@StatusId", dto.StatusId),
        new SqlParameter("@UserId", userId)
    };

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_VehicleTripEmission_UpdateStatus @TripId,@StatusId,@UserId",
                parameters);

            return true;
        }
       public  async Task<ResponseVehicleTripEmissionDTO> CreateAsync(CreateVehicleTripEmissionDTO dto)
        {
            //        var userId = GetCurrentUserId();

            //        int vehicleId = _idEncoder.Decode(dto.VehicleId);
            //        int fromCityId = _idEncoder.Decode(dto.FromCityId);
            //        int toCityId = _idEncoder.Decode(dto.ToCityId);

            //        var parameters = new[]
            //        {
            //    new SqlParameter("@VehicleId", vehicleId),
            //    new SqlParameter("@FromCityId", fromCityId),
            //    new SqlParameter("@ToCityId", toCityId),
            //    new SqlParameter("@TripStartDateTime", dto.TripStartDateTime),
            //    new SqlParameter("@TripEndDateTime", dto.TripEndDateTime ?? (object)DBNull.Value),
            //    new SqlParameter("@DistanceKm", dto.DistanceKm),
            //    new SqlParameter("@FuelConsumedLtr", dto.FuelConsumedLtr),
            //    new SqlParameter("@UserId", userId)
            //};

            //        var result = await _context.CB_VehicleTripEmissions
            //            .FromSqlRaw(
            //                "EXEC USP_CB_InsertVehicleTripEmission " +
            //                "@VehicleId,@FromCityId,@ToCityId,@TripStartDateTime," +
            //                "@TripEndDateTime,@DistanceKm,@FuelConsumedLtr,@UserId",
            //                parameters)
            //            .ToListAsync();

            //        var entity = result.FirstOrDefault();

            //        return new ResponseVehicleTripEmissionDTO
            //        {
            //            TripId = _idEncoder.Encode(entity.tripid),
            //            VehicleId = _idEncoder.Encode(entity.vehicleid),
            //            FromCityId = _idEncoder.Encode(entity.fromcityid),
            //            ToCityId = _idEncoder.Encode(entity.tocityid),
            //            TripStartDateTime = entity.tripstartdatetime,
            //            TripEndDateTime = entity.tripenddatetime,
            //            DistanceKm = entity.distancekm,
            //            FuelConsumedLtr = entity.fuelconsumedltr,

            //            CO2 = entity.co2,
            //            NO2 = entity.no2,
            //            CH4 = entity.ch4,

            //            TotalCO2 = entity.totalco2,
            //            TotalNO2 = entity.totalno2,
            //            TotalCH4 = entity.totalch4,

            //            TotalEmission = entity.totalemission,
            //            StatusId = entity.StatusId
            //        };
            var userId = GetCurrentUserId();

            int vehicleId = _idEncoder.Decode(dto.VehicleId);
            int fromCityId = _idEncoder.Decode(dto.FromCityId);
            int toCityId = _idEncoder.Decode(dto.ToCityId);

            decimal fuelConsumed = dto.FuelConsumedLtr;
            // For Petrol/Diesel = Liter
            // For CNG = KG (conversion handled in SQL)

            var parameters = new[]
            {
        new SqlParameter("@VehicleId", vehicleId),
        new SqlParameter("@FromCityId", fromCityId),
        new SqlParameter("@ToCityId", toCityId),
        new SqlParameter("@TripStartDateTime", dto.TripStartDateTime),
        new SqlParameter("@TripEndDateTime", dto.TripEndDateTime ?? (object)DBNull.Value),
        new SqlParameter("@DistanceKm", dto.DistanceKm),
        new SqlParameter("@FuelConsumedLtr", fuelConsumed),
        new SqlParameter("@UserId", userId)
    };

            var result = await _context.CB_VehicleTripEmissions
                .FromSqlRaw(
                    "EXEC USP_CB_InsertVehicleTripEmission " +
                    "@VehicleId,@FromCityId,@ToCityId,@TripStartDateTime," +
                    "@TripEndDateTime,@DistanceKm,@FuelConsumedLtr,@UserId",
                    parameters)
                .ToListAsync();

            var entity = result.FirstOrDefault();

            if (entity == null)
                throw new Exception("Trip emission record not created.");

            return new ResponseVehicleTripEmissionDTO
            {
                TripId = _idEncoder.Encode(entity.tripid),
                VehicleId = _idEncoder.Encode(entity.vehicleid),
                FromCityId = _idEncoder.Encode(entity.fromcityid),
                ToCityId = _idEncoder.Encode(entity.tocityid),

                TripStartDateTime = entity.tripstartdatetime,
                TripEndDateTime = entity.tripenddatetime,
                DistanceKm = entity.distancekm,

                FuelConsumedLtr = entity.fuelconsumedltr,

                CO2 = entity.co2,
                NO2 = entity.no2,
                CH4 = entity.ch4,

                TotalCO2 = entity.totalco2,
                TotalNO2 = entity.totalno2,
                TotalCH4 = entity.totalch4,

                TotalEmission = entity.totalemission,
                StatusId = entity.StatusId
            };
        }

       public async Task<List<ResponseVehicleTripEmissionDTO>> GetAllAsync()
        {
            var data = await _context.CB_VehicleTripEmissions
       .FromSqlRaw("EXEC USP_CB_GetAllVehicleTripEmission")
       .ToListAsync();

            return data.Select(x => new ResponseVehicleTripEmissionDTO
            {
                TripId = _idEncoder.Encode(x.tripid),
                VehicleId = _idEncoder.Encode(x.vehicleid),
                FromCityId = _idEncoder.Encode(x.fromcityid),
                ToCityId = _idEncoder.Encode(x.tocityid),
                TripStartDateTime = x.tripstartdatetime,
                TripEndDateTime = x.tripenddatetime,
                DistanceKm = x.distancekm,
                FuelConsumedLtr = x.fuelconsumedltr,

                CO2 = x.co2,
                NO2 = x.no2,
                CH4 = x.ch4,

                
                TotalCO2 = x.totalco2,
                TotalNO2 = x.totalno2,
                TotalCH4 = x.totalch4,

                TotalEmission = x.totalemission,
                StatusId = x.StatusId
            }).ToList();
        }

         public async Task<ResponseVehicleTripEmissionDTO> GetByHashIdAsync(string hashId)
        {
            int tripId = _idEncoder.Decode(hashId);

            var data = await _context.CB_VehicleTripEmissions
                .FromSqlRaw("EXEC USP_CB_GetVehicleTripEmissionById @tripid",
                    new SqlParameter("@tripid", tripId))
                .ToListAsync();

            var entity = data.FirstOrDefault();
            if (entity == null) return null;
            return new ResponseVehicleTripEmissionDTO
            {
                TripId = hashId,
                VehicleId = _idEncoder.Encode(entity.vehicleid),
                FromCityId = _idEncoder.Encode(entity.fromcityid),
                ToCityId = _idEncoder.Encode(entity.tocityid),
                TripStartDateTime = entity.tripstartdatetime,
                TripEndDateTime = entity.tripenddatetime,
                DistanceKm = entity.distancekm,
                FuelConsumedLtr = entity.fuelconsumedltr,

                CO2 = entity.co2,
                NO2 = entity.no2,
                CH4 = entity.ch4,

                TotalCO2 = entity.totalco2,
                TotalNO2 = entity.totalno2,
                TotalCH4 = entity.totalch4,

                TotalEmission = entity.totalemission,
                StatusId = entity.StatusId
            };
        }
    }
}
