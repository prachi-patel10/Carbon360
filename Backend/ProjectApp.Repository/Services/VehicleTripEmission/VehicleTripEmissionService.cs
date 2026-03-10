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
using ProjectApp.Repository.Utilities.SP;
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

                FuelType = entity.fueltype,

                //CO2Factor = entity.co2,

                //NO2Factor = entity.no2,

                //CH4Factor = entity.ch4,

                TotalCO2 = entity.totalco2,
                TotalNO2 = entity.totalno2,
                TotalCH4 = entity.totalch4,

                TotalEmission = entity.totalemission,
                StatusId = entity.StatusId
            };
        }

        private string GetCurrentUserRole()
        {
            if (_userContext == null)
                throw new Exception("User context is not initialized");

            return _userContext.Role; // assuming Role property exists
        }

        public async Task<(IEnumerable<SearchVehicleTripEmissionDTO>, int)> SearchVehicleTrips(string? search, string? vehicleNumber, string? fuelType, string? vehicleType, DateTime? startDate, DateTime? endDate, int? statusId, string? userRole, int pageNumber = 1, int pageSize = 10)
        {
            int userId = GetCurrentUserId();
            string role = _userContext.Role;

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_SearchVehicleTripEmission";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@Search", (object?)search ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@VehicleNumber", (object?)vehicleNumber ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@FuelType", (object?)fuelType ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@VehicleType", (object?)vehicleType ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@StartDate", (object?)startDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@EndDate", (object?)endDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@StatusId", (object?)statusId ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@UserId", userId));
            command.Parameters.Add(new SqlParameter("@UserRole", role));
            command.Parameters.Add(new SqlParameter("@PageNumber", pageNumber));
            command.Parameters.Add(new SqlParameter("@PageSize", pageSize));

            var totalParam = new SqlParameter("@TotalRecords", SqlDbType.Int)
            {
                Direction = ParameterDirection.Output
            };

            command.Parameters.Add(totalParam);

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var result = new List<SearchVehicleTripEmissionDTO>();

            await using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                var dto = new SearchVehicleTripEmissionDTO
                {
                    TripId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("TripId"))),

                    VehicleNumber = reader["VehicleNumber"]?.ToString() ?? "",
                    VehicleType = reader["VehicleType"]?.ToString() ?? "",
                    FuelType = reader["FuelType"]?.ToString() ?? "",

                    DistanceKm = reader.IsDBNull(reader.GetOrdinal("DistanceKm")) ? 0 :
                                 reader.GetDecimal(reader.GetOrdinal("DistanceKm")),

                    FuelConsumedLtr = reader.IsDBNull(reader.GetOrdinal("FuelConsumedLtr")) ? 0 :
                                      reader.GetDecimal(reader.GetOrdinal("FuelConsumedLtr")),

                    TripStartDateTime = reader.GetDateTime(reader.GetOrdinal("TripStartDateTime")),

                    TripEndDateTime = reader.IsDBNull(reader.GetOrdinal("TripEndDateTime"))
                        ? DateTime.MinValue
                        : reader.GetDateTime(reader.GetOrdinal("TripEndDateTime")),

                    TotalCO2 = reader.IsDBNull(reader.GetOrdinal("TotalCO2")) ? 0 :
                               reader.GetDecimal(reader.GetOrdinal("TotalCO2")),

                    TotalNO2 = reader.IsDBNull(reader.GetOrdinal("TotalNO2")) ? 0 :
                               reader.GetDecimal(reader.GetOrdinal("TotalNO2")),

                    TotalCH4 = reader.IsDBNull(reader.GetOrdinal("TotalCH4")) ? 0 :
                               reader.GetDecimal(reader.GetOrdinal("TotalCH4")),

                    TotalEmission = reader.IsDBNull(reader.GetOrdinal("TotalEmission")) ? 0 :
                                         reader.GetDecimal(reader.GetOrdinal("TotalEmission")),

                    StatusId = reader.IsDBNull(reader.GetOrdinal("StatusId")) ? 0 :
                               reader.GetInt32(reader.GetOrdinal("StatusId"))
                };

                result.Add(dto);
            }

            await reader.CloseAsync();

            int totalRecords = totalParam.Value != DBNull.Value
                ? (int)totalParam.Value
                : result.Count;

            return (result, totalRecords);
        }

        public async Task<PageResult> GetMyActionTripsAsync(int pageNumber, int pageSize, string sortColumn = "fromCity", string sortDirection = "ASC")
        {
            int userId = GetCurrentUserId();

            string role = _userContext.Role.Contains("Corporate")
                ? "Corporate"
                : "Reporter";

            var result = new List<ResponseVehicleTripEmissionDTO>();
            int totalRecords = 0;

            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();

                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "USP_CB_GetVehicleTripEmission";
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add(new SqlParameter("@UserId", userId));
                    cmd.Parameters.Add(new SqlParameter("@UserRole", role));
                    cmd.Parameters.Add(new SqlParameter("@PageNumber", pageNumber));
                    cmd.Parameters.Add(new SqlParameter("@PageSize", pageSize));
                    cmd.Parameters.Add(new SqlParameter("@SortColumn", sortColumn));
                    cmd.Parameters.Add(new SqlParameter("@SortDirection", sortDirection));

                    var totalParam = new SqlParameter("@TotalRecords", SqlDbType.Int)
                    {
                        Direction = ParameterDirection.Output
                    };

                    cmd.Parameters.Add(totalParam);

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            result.Add(new ResponseVehicleTripEmissionDTO
                            {
                                TripId = _idEncoder.Encode(Convert.ToInt32(reader["TripId"])),

                                VehicleId = _idEncoder.Encode(Convert.ToInt32(reader["VehicleId"])),

                                VehicleName = reader["VehicleName"]?.ToString(),

                                FromCityId = _idEncoder.Encode(Convert.ToInt32(reader["FromCityId"])),

                                FromCity = reader["FromCity"]?.ToString(),

                                ToCityId = _idEncoder.Encode(Convert.ToInt32(reader["ToCityId"])),

                                ToCity = reader["ToCity"]?.ToString(),

                                TripStartDateTime = Convert.ToDateTime(reader["TripStartDateTime"]),

                                TripEndDateTime = reader["TripEndDateTime"] == DBNull.Value
        ? null
        : Convert.ToDateTime(reader["TripEndDateTime"]),

                                TotalEmission = Convert.ToDecimal(reader["TotalEmission"]),

                                StatusId = Convert.ToInt32(reader["StatusId"])
                            });
                        }
                    }

                    totalRecords = totalParam.Value != DBNull.Value
                        ? Convert.ToInt32(totalParam.Value)
                        : result.Count;
                }
            }

            return new PageResult
            {
                Data = result,
                TotalRecords = totalRecords,
                TotalPages = (int)Math.Ceiling((double)totalRecords / pageSize),
                CurrentPage = pageNumber
            };
        }


    }
}
    

