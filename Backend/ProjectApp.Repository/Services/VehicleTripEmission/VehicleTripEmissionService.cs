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
            var id = _idEncoder.Decode(hashId);

            var record = await _commonService.GetById(x => x.tripid == id);
            if (record == null) return false;

            record.isactive = false;
            record.updateby = GetCurrentUserId();
            record.updatedate = DateTime.Now;

            await _commonService.UpdateAsync(record);
            return true;
        }

        public async Task<ResponseVehicleTripEmissionDTO> UpdateAsync(UpdateVehicleTripEmissionDTO dto)
        {
            int userId = GetCurrentUserId();

            int tripId = _idEncoder.Decode(dto.TripId);
            int vehicleId = _idEncoder.Decode(dto.VehicleId);
            int fromCityId = _idEncoder.Decode(dto.FromCityId);
            int toCityId = _idEncoder.Decode(dto.ToCityId);

            var entity = await _context.CB_VehicleTripEmissions
                .FirstOrDefaultAsync(x => x.tripid == tripId && x.isactive);

            if (entity == null)
                return null;

            // 🚫 Block Approved
            if (entity.StatusId == 3)
                throw new Exception("Approved trip cannot be modified.");

            // 🚫 Block Reviewed
            if (entity.StatusId == 2)
                throw new Exception("Trip under review cannot be modified.");

            // Update values
            entity.vehicleid = vehicleId;
            entity.fromcityid = fromCityId;
            entity.tocityid = toCityId;
            entity.tripstartdatetime = dto.TripStartDateTime;
            entity.tripenddatetime = dto.TripEndDateTime;
            entity.distancekm = dto.DistanceKm;
            entity.fueltype = dto.FuelType;
            entity.fuelconsumedltr = dto.FuelConsumedLtr;

            // 🔁 If rejected → reset to reported
            if (entity.StatusId == 4)
                entity.StatusId = 1;

            entity.updateby = userId;
            entity.updatedate = DateTime.Now;

            await _context.SaveChangesAsync();

            return new ResponseVehicleTripEmissionDTO
            {
                TripId = dto.TripId,
                VehicleId = _idEncoder.Encode(entity.vehicleid),
                FromCityId = _idEncoder.Encode(entity.fromcityid),
                ToCityId = _idEncoder.Encode(entity.tocityid),

                TripStartDateTime = entity.tripstartdatetime,
                TripEndDateTime = entity.tripenddatetime,
                DistanceKm = entity.distancekm,
                FuelType = entity.fueltype,
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

            var entity = await _context.CB_VehicleTripEmissions
                .FirstOrDefaultAsync(x => x.tripid == tripId && x.isactive);

            if (entity == null)
                return false;

            // Strict Workflow
            if (entity.StatusId == 1 && dto.StatusId != 2)
                throw new Exception("Reported trip can only move to Reviewed.");

            if (entity.StatusId == 2 && dto.StatusId != 3 && dto.StatusId != 4)
                throw new Exception("Reviewed trip can only move to Approved or Rejected.");

            if (entity.StatusId == 3)
                throw new Exception("Approved trip is final.");

            entity.StatusId = dto.StatusId;
            entity.updateby = userId;
            entity.updatedate = DateTime.Now;

            await _context.SaveChangesAsync();
            return true;
        }
        async Task<ResponseVehicleTripEmissionDTO> IVehicleTripEmissionService.CreateAsync(CreateVehicleTripEmissionDTO dto)
        {
            var userId = GetCurrentUserId();

            int vehicleId = _idEncoder.Decode(dto.VehicleId);
            int fromCityId = _idEncoder.Decode(dto.FromCityId);
            int toCityId = _idEncoder.Decode(dto.ToCityId);

            var outputId = new SqlParameter("@newTripId", SqlDbType.Int)
            {
                Direction = ParameterDirection.Output
            };

            var parameters = new[]
            {
        new SqlParameter("@vehicleid", vehicleId),
        new SqlParameter("@fromcityid", fromCityId),
        new SqlParameter("@tocityid", toCityId),
        new SqlParameter("@tripstartdatetime", dto.TripStartDateTime),
        new SqlParameter("@tripenddatetime", dto.TripEndDateTime ?? (object)DBNull.Value),
        new SqlParameter("@distancekm", dto.DistanceKm),
        new SqlParameter("@fueltype", dto.FuelType ?? (object)DBNull.Value),
        new SqlParameter("@fuelconsumedltr", dto.FuelConsumedLtr),
        new SqlParameter("@entryby", userId),

        // ✅ ADD THIS LINE
        new SqlParameter("@statusid", dto.StatusId),

        outputId
    };

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_InsertVehicleTripEmission " +
                "@vehicleid,@fromcityid,@tocityid,@tripstartdatetime," +
                "@tripenddatetime,@distancekm,@fueltype,@fuelconsumedltr," +
                "@entryby,@statusid,@newTripId OUTPUT",
                parameters);

            int newId = (int)outputId.Value;

            var entity = await _context.CB_VehicleTripEmissions
                .FirstOrDefaultAsync(x => x.tripid == newId);

            if (entity == null)
                throw new Exception("Trip insertion failed.");

            return new ResponseVehicleTripEmissionDTO
            {
                TripId = _idEncoder.Encode(entity.tripid),
                VehicleId = _idEncoder.Encode(entity.vehicleid),
                FromCityId = _idEncoder.Encode(entity.fromcityid),
                ToCityId = _idEncoder.Encode(entity.tocityid),

                TripStartDateTime = entity.tripstartdatetime,
                TripEndDateTime = entity.tripenddatetime,
                DistanceKm = entity.distancekm,
                FuelType = entity.fueltype,
                FuelConsumedLtr = entity.fuelconsumedltr,

                CO2 = entity.co2,
                NO2 = entity.no2,
                CH4 = entity.ch4,
                TotalEmission = entity.totalemission,

                // ✅ ADD THIS
                StatusId = entity.StatusId
            };
        }

        async Task<List<ResponseVehicleTripEmissionDTO>> IVehicleTripEmissionService.GetAllAsync()
        {
            var data = await _commonService.GetAllData(x => x.isactive);

            return data.Select(x => new ResponseVehicleTripEmissionDTO
            {
                TripId = _idEncoder.Encode(x.tripid),
                VehicleId = _idEncoder.Encode(x.vehicleid),
                FromCityId = _idEncoder.Encode(x.fromcityid),
                ToCityId = _idEncoder.Encode(x.tocityid),
                TripStartDateTime = x.tripstartdatetime,
                TripEndDateTime = x.tripenddatetime,
                DistanceKm = x.distancekm,
                FuelType = x.fueltype,
                FuelConsumedLtr = x.fuelconsumedltr,
                CO2 = x.co2,
                NO2 = x.no2,
                CH4 = x.ch4,
                TotalEmission = x.totalemission,
                StatusId = x.StatusId
            }).ToList();
        }

        async Task<ResponseVehicleTripEmissionDTO> IVehicleTripEmissionService.GetByHashIdAsync(string hashId)
        {
            var id = _idEncoder.Decode(hashId);

            var entity = await _commonService.GetById(x => x.tripid == id && x.isactive);

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
                FuelType = entity.fueltype,
                FuelConsumedLtr = entity.fuelconsumedltr,
                CO2 = entity.co2,
                NO2 = entity.no2,
                CH4 = entity.ch4,
                TotalEmission = entity.totalemission
            };
        }
    }
}
