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


       
        async Task<ResponseVehicleTripEmissionDTO> IVehicleTripEmissionService.CreateAsync(CreateVehicleTripEmissionDTO dto)
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
                "EXEC USP_CB_InsertVehicleTripEmission " +
                "@vehicleid,@fromcityid,@tocityid,@tripstartdatetime," +
                "@tripenddatetime,@distancekm,@fueltype,@fuelconsumedltr," +
                "@entryby,@newTripId OUTPUT",
                parameters);

            int newId = (int)outputId.Value;

            // Fetch inserted record (to get calculated values)
            var entity = await _context.CB_VehicleTripEmissions
                .FirstOrDefaultAsync(x => x.tripid == newId);

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
                TotalEmission = entity.totalemission
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
                TotalEmission = x.totalemission
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
