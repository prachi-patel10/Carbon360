using AutoMapper;
using HashidsNet;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Account.VehicleTripEmission;
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

        public async Task<VehicleTripEmissionDTO> CreateAsync(VehicleTripEmissionDTO dto)
        {
            var userId = GetCurrentUserId();

            var outputId = new SqlParameter("@newTripId", SqlDbType.Int)
            {
                Direction = ParameterDirection.Output
            };

            var parameters = new[]
            {
        new SqlParameter("@vehicleid", dto.VehicleId),
        new SqlParameter("@fromcityid", dto.FromCityId),
        new SqlParameter("@tocityid", dto.ToCityId),
        new SqlParameter("@tripstartdatetime", dto.TripStartDateTime),
        new SqlParameter("@tripenddatetime", dto.TripEndDateTime ?? (object)DBNull.Value),
        new SqlParameter("@distancekm", dto.DistanceKm),
        new SqlParameter("@fueltype", dto.FuelType),
        new SqlParameter("@fuelconsumedltr", dto.FuelConsumedLtr),
        new SqlParameter("@entryby", userId),
        outputId
    };

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_InsertVehicleTripEmission @vehicleid,@fromcityid,@tocityid,@tripstartdatetime,@tripenddatetime,@distancekm,@fueltype,@fuelconsumedltr,@entryby,@newTripId OUTPUT",
                parameters);

            int newId = (int)outputId.Value;

            // ✅ Encode and assign
            dto.TripId = _idEncoder.Encode(newId);

            return dto;
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

        public async Task<List<VehicleTripEmissionDTO>> GetAllAsync()
        {
            var data = await _commonService.GetAllData(x => x.isactive);

            return data.Select(x => new VehicleTripEmissionDTO
            {
                TripId = _idEncoder.Encode(x.tripid),
                VehicleId = x.vehicleid,
                FromCityId = x.fromcityid,
                ToCityId = x.tocityid,
                TripStartDateTime = x.tripstartdatetime,
                TripEndDateTime = x.tripenddatetime,
                DistanceKm = x.distancekm,
                FuelType = x.fueltype,
                FuelConsumedLtr = x.fuelconsumedltr,
                CO2 = x.co2,
                NO2 = x.no2,
                CH4 = x.ch4,
                TotalEmission = x.totalemission
            }).ToList();
        }

        public async Task<VehicleTripEmissionDTO> GetByHashIdAsync(string hashId)
        {
            var id = _idEncoder.Decode(hashId);

            var data = await _commonService.GetById(x => x.tripid == id && x.isactive);

            if (data == null) return null;

            return new VehicleTripEmissionDTO
            {
                TripId = hashId,
                VehicleId = data.vehicleid,
                FromCityId = data.fromcityid,
                ToCityId = data.tocityid,
                TripStartDateTime = data.tripstartdatetime,
                TripEndDateTime = data.tripenddatetime,
                DistanceKm = data.distancekm,
                FuelType = data.fueltype,
                FuelConsumedLtr = data.fuelconsumedltr,
                CO2 = data.co2,
                NO2 = data.no2,
                CH4 = data.ch4,
                TotalEmission = data.totalemission
            };
        }
    }
}
