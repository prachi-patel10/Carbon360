using AutoMapper;
using Azure;
using DocumentFormat.OpenXml.Bibliography;
using DocumentFormat.OpenXml.Drawing.Spreadsheet;
using DocumentFormat.OpenXml.InkML;
using DocumentFormat.OpenXml.Office.Word;
using DocumentFormat.OpenXml.Spreadsheet;
using HashidsNet;
using Irony.Parsing;
using Microsoft.AspNetCore.Components;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Account.VehicleTripEmission;
using ProjectApp.Core.DTOs.Common;
using ProjectApp.Core.DTOs.Masters.VehicleType;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Interfaces.VehicleTripEmission;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Services.User;
using ProjectApp.Repository.Utilities.Auth;
using ProjectApp.Repository.Utilities.SP;
using PuppeteerSharp;
using PuppeteerSharp.Media;
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
            string role = _userContext.Role;
            if (!_userContext.Role.Split(',').Contains("Reporter"))
                throw new Exception("Only Reporter can update trip records.");
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
            if (entity == null)
                throw new Exception("Trip not found.");


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
                TotalCO2 = entity.totalco2,
                TotalNO2 = entity.totalno2,
                TotalCH4 = entity.totalch4,
                TotalEmission = entity.totalemission,
                StatusId = entity.StatusId
            };
        }

        public async Task<bool> UpdateStatusAsync(VehicleTripStatusUpdateDTO dto)
        {
            //        int tripId = _idEncoder.Decode(dto.TripId);
            //        int userId = GetCurrentUserId();

            //        var parameters = new[]
            //        {
            //    new SqlParameter("@TripId", tripId),
            //    new SqlParameter("@StatusId", dto.StatusId),
            //    new SqlParameter("@UserId", userId)
            //};

            //        await _context.Database.ExecuteSqlRawAsync(
            //            "EXEC USP_CB_VehicleTripEmission_UpdateStatus @TripId,@StatusId,@UserId",
            //            parameters);

            //        return true;

            int tripId = _idEncoder.Decode(dto.TripId);
            int userId = GetCurrentUserId();
            int roleId = _userContext.Role.Contains("Corporate") ? 3 : 5;
            //string role = _userContext.Role;

            //if (!role.Contains("Corporate"))
            //    throw new Exception("Only Corporate users can approve or reject trips.");

            //if (dto.StatusId != 2 && dto.StatusId != 3)
            //    throw new Exception("Invalid StatusId. Only Approve (2) or Reject (3) allowed.");

            // Get current status
            //var trip = await _context.CB_VehicleTripEmissions
            //    .Where(x => x.tripid == tripId && x.isactive)
            //    .FirstOrDefaultAsync();

            //if (trip == null)
            //    throw new Exception("Trip not found.");

            //if (trip.StatusId == 2)
            //    throw new Exception("Trip already approved.");

            var parameters = new[]
            {
        new SqlParameter("@TripId", tripId),
        new SqlParameter("@WorkflowId", dto.WorkflowId),
        new SqlParameter("@UserId", userId),
        new SqlParameter("@RoleId", roleId)

    };

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_UpdateVehicleTripStatus @TripId,@WorkflowId,@UserId,@RoleId",
                parameters);

            return true;
        }


        public async Task<ResponseVehicleTripEmissionDTO> CreateAsync(CreateVehicleTripEmissionDTO dto)
        {
            int userId = GetCurrentUserId();
            string role = _userContext.Role;

            if (!role.Contains("Reporter"))
                throw new Exception("Only Reporter can create trip records.");

            int vehicleId = _idEncoder.Decode(dto.VehicleId);
            int fromCityId = _idEncoder.Decode(dto.FromCityId);
            int toCityId = _idEncoder.Decode(dto.ToCityId);
            int roleId = _userContext.Role.Contains("Corporate") ? 3 : 5;

            ResponseVehicleTripEmissionDTO response = null;

            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();

                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "USP_CB_InsertVehicleTripEmission";
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add(new SqlParameter("@VehicleId", vehicleId));
                    cmd.Parameters.Add(new SqlParameter("@FromCityId", fromCityId));
                    cmd.Parameters.Add(new SqlParameter("@ToCityId", toCityId));
                    cmd.Parameters.Add(new SqlParameter("@TripStartDateTime", dto.TripStartDateTime));
                    cmd.Parameters.Add(new SqlParameter("@TripEndDateTime", dto.TripEndDateTime ?? (object)DBNull.Value));
                    cmd.Parameters.Add(new SqlParameter("@DistanceKm", dto.DistanceKm));
                    cmd.Parameters.Add(new SqlParameter("@FuelConsumedLtr", dto.FuelConsumedLtr));
                    cmd.Parameters.Add(new SqlParameter("@UserId", userId));
                    cmd.Parameters.Add(new SqlParameter("@RoleId", roleId));

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            response = new ResponseVehicleTripEmissionDTO
                            {
                                TripId = _idEncoder.Encode(Convert.ToInt32(reader["tripid"])),
                                ReportId = reader["ReportId"]?.ToString(),

                                VehicleId = _idEncoder.Encode(Convert.ToInt32(reader["vehicleid"])),
                                FromCityId = _idEncoder.Encode(Convert.ToInt32(reader["fromcityid"])),
                                ToCityId = _idEncoder.Encode(Convert.ToInt32(reader["tocityid"])),

                                TripStartDateTime = Convert.ToDateTime(reader["tripstartdatetime"]),
                                TripEndDateTime = reader["tripenddatetime"] == DBNull.Value
                                    ? null
                                    : Convert.ToDateTime(reader["tripenddatetime"]),

                                DistanceKm = Convert.ToDecimal(reader["distancekm"]),
                                FuelConsumedLtr = Convert.ToDecimal(reader["fuelconsumedltr"]),

                                CO2 = reader["co2"] == DBNull.Value ? null : Convert.ToDecimal(reader["co2"]),
                                NO2 = reader["no2"] == DBNull.Value ? null : Convert.ToDecimal(reader["no2"]),
                                CH4 = reader["ch4"] == DBNull.Value ? null : Convert.ToDecimal(reader["ch4"]),

                                TotalCO2 = reader["totalco2"] == DBNull.Value ? null : Convert.ToDecimal(reader["totalco2"]),
                                TotalNO2 = reader["totalno2"] == DBNull.Value ? null : Convert.ToDecimal(reader["totalno2"]),
                                TotalCH4 = reader["totalch4"] == DBNull.Value ? null : Convert.ToDecimal(reader["totalch4"]),
                                TotalEmission = reader["totalemission"] == DBNull.Value ? null : Convert.ToDecimal(reader["totalemission"]),

                                StatusId = Convert.ToInt32(reader["StatusId"]),
                                EntryBy = reader["entryby"] == DBNull.Value ? null : Convert.ToInt32(reader["entryby"]),
                                EntryDate = reader["entrydate"] == DBNull.Value ? null : Convert.ToDateTime(reader["entrydate"]),
                                FuelType = reader["fueltype"]?.ToString(),
                                VehicleNumber = reader["VehicleNumber"]?.ToString(),
                                VehicleType = reader["VehicleType"]?.ToString(),
                                FromCity = reader["FromCity"]?.ToString(),
                                ToCity = reader["ToCity"]?.ToString()
                            };
                        }
                    }
                }
            }

            if (response == null)
                throw new Exception("Trip emission record not created.");

            return response;

        }

       //public async Task<List<ResponseVehicleTripEmissionDTO>> GetAllAsync()
       // {
       //     var data = await _context.CB_VehicleTripEmissions
       //.FromSqlRaw("EXEC USP_CB_GetAllVehicleTripEmission")
       //.ToListAsync();

       //     return data.Select(x => new ResponseVehicleTripEmissionDTO
       //     {
       //         TripId = _idEncoder.Encode(x.tripid),
       //         VehicleId = _idEncoder.Encode(x.vehicleid),
       //         VehicleNumber = x.VehicleName,
       //         VehicleType = x.VehicleType,
       //         FromCityId = _idEncoder.Encode(x.fromcityid),
       //         ToCityId = _idEncoder.Encode(x.tocityid),
       //         TripStartDateTime = x.tripstartdatetime,
       //         TripEndDateTime = x.tripenddatetime,
       //         DistanceKm = x.distancekm,
       //         FuelConsumedLtr = x.fuelconsumedltr,
       //         CO2 = x.co2,
       //         NO2 = x.no2,
       //         CH4 = x.ch4,
       //         TotalCO2 = x.totalco2,
       //         TotalNO2 = x.totalno2,
       //         TotalCH4 = x.totalch4,

       //         TotalEmission = x.totalemission,
       //         StatusId = x.StatusId
       //     }).ToList();
       // }

         public async Task<ResponseVehicleTripEmissionDTO> GetByHashIdAsync(string hashId)
        {
            int tripId = _idEncoder.Decode(hashId);

            ResponseVehicleTripEmissionDTO result = null;

            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();

                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "USP_CB_GetVehicleTripEmissionById";
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add(new SqlParameter("@tripid", tripId));

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            result = new ResponseVehicleTripEmissionDTO
                            {
                                TripId = hashId,
                                ReportId = reader["ReportId"]?.ToString(),
                                VehicleId = _idEncoder.Encode(Convert.ToInt32(reader["VehicleId"])),

                                FromCityId = reader["FromCityId"] == DBNull.Value
                                    ? null
                                    : _idEncoder.Encode(Convert.ToInt32(reader["FromCityId"])),

                                ToCityId = reader["ToCityId"] == DBNull.Value
                                    ? null
                                    : _idEncoder.Encode(Convert.ToInt32(reader["ToCityId"])),

                                TripStartDateTime = Convert.ToDateTime(reader["TripStartDateTime"]),
                                TripEndDateTime = reader["TripEndDateTime"] == DBNull.Value
                                    ? null
                                    : Convert.ToDateTime(reader["TripEndDateTime"]),

                                DistanceKm = Convert.ToDecimal(reader["DistanceKm"]),
                                FuelConsumedLtr = Convert.ToDecimal(reader["FuelConsumedLtr"]),

                                CO2 = reader["CO2"] == DBNull.Value ? null : Convert.ToDecimal(reader["CO2"]),
                                NO2 = reader["NO2"] == DBNull.Value ? null : Convert.ToDecimal(reader["NO2"]),
                                CH4 = reader["CH4"] == DBNull.Value ? null : Convert.ToDecimal(reader["CH4"]),

                                TotalCO2 = reader["TotalCO2"] == DBNull.Value ? null : Convert.ToDecimal(reader["TotalCO2"]),
                                TotalNO2 = reader["TotalNO2"] == DBNull.Value ? null : Convert.ToDecimal(reader["TotalNO2"]),
                                TotalCH4 = reader["TotalCH4"] == DBNull.Value ? null : Convert.ToDecimal(reader["TotalCH4"]),
                                TotalEmission = reader["TotalEmission"] == DBNull.Value ? null : Convert.ToDecimal(reader["TotalEmission"]),

                                StatusId = Convert.ToInt32(reader["StatusId"]),

                               
                                VehicleNumber = reader["VehicleNumber"]?.ToString(),
                                VehicleType = reader["VehicleType"]?.ToString(),

                                FromCity = reader["FromCity"]?.ToString(),
                                ToCity = reader["ToCity"]?.ToString(),

                                FuelType = reader["FuelType"]?.ToString(),

                                EntryBy = reader["EntryBy"] == DBNull.Value ? null : Convert.ToInt32(reader["EntryBy"]),
                                EntryDate = reader["EntryDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["EntryDate"])
                            };
                        }
                    }
                }
            }

            return result;
        }

        private string GetCurrentUserRole()
        {
            if (_userContext == null)
                throw new Exception("User context is not initialized");

            return _userContext.Role; // assuming Role property exists
        }

        //public async Task<(IEnumerable<SearchVehicleTripEmissionDTO>, int)> SearchVehicleTrips(string? search, string? vehicleNumber, string? fuelType, string? vehicleType, DateTime? startDate, DateTime? endDate, int? statusId, string? userRole, int pageNumber = 1, int pageSize = 10)
        //{
        //    int userId = GetCurrentUserId();
        //    string role = _userContext.Role;

        //    await using var connection = _context.Database.GetDbConnection();
        //    await using var command = connection.CreateCommand();

        //    command.CommandText = "USP_CB_SearchVehicleTripEmission";
        //    command.CommandType = CommandType.StoredProcedure;

        //    command.Parameters.Add(new SqlParameter("@Search", (object?)search ?? DBNull.Value));
        //    command.Parameters.Add(new SqlParameter("@VehicleNumber", (object?)vehicleNumber ?? DBNull.Value));
        //    command.Parameters.Add(new SqlParameter("@FuelType", (object?)fuelType ?? DBNull.Value));
        //    command.Parameters.Add(new SqlParameter("@VehicleType", (object?)vehicleType ?? DBNull.Value));
        //    command.Parameters.Add(new SqlParameter("@StartDate", (object?)startDate ?? DBNull.Value));
        //    command.Parameters.Add(new SqlParameter("@EndDate", (object?)endDate ?? DBNull.Value));
        //    command.Parameters.Add(new SqlParameter("@StatusId", (object?)statusId ?? DBNull.Value));
        //    command.Parameters.Add(new SqlParameter("@UserId", userId));
        //    command.Parameters.Add(new SqlParameter("@UserRole", role));
        //    command.Parameters.Add(new SqlParameter("@PageNumber", pageNumber));
        //    command.Parameters.Add(new SqlParameter("@PageSize", pageSize));

        //    var totalParam = new SqlParameter("@TotalRecords", SqlDbType.Int)
        //    {
        //        Direction = ParameterDirection.Output
        //    };

        //    command.Parameters.Add(totalParam);

        //    if (connection.State != ConnectionState.Open)
        //        await connection.OpenAsync();

        //    var result = new List<SearchVehicleTripEmissionDTO>();

        //    await using var reader = await command.ExecuteReaderAsync();

        //    while (await reader.ReadAsync())
        //    {
        //        var dto = new SearchVehicleTripEmissionDTO
        //        {
        //            TripId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("TripId"))),

        //            VehicleNumber = reader["VehicleNumber"]?.ToString() ?? "",
        //            VehicleType = reader["VehicleType"]?.ToString() ?? "",
        //            FuelType = reader["FuelType"]?.ToString() ?? "",

        //            DistanceKm = reader.IsDBNull(reader.GetOrdinal("DistanceKm")) ? 0 :
        //                         reader.GetDecimal(reader.GetOrdinal("DistanceKm")),

        //            FuelConsumedLtr = reader.IsDBNull(reader.GetOrdinal("FuelConsumedLtr")) ? 0 :
        //                              reader.GetDecimal(reader.GetOrdinal("FuelConsumedLtr")),

        //            TripStartDateTime = reader.GetDateTime(reader.GetOrdinal("TripStartDateTime")),

        //            TripEndDateTime = reader.IsDBNull(reader.GetOrdinal("TripEndDateTime"))
        //                ? DateTime.MinValue
        //                : reader.GetDateTime(reader.GetOrdinal("TripEndDateTime")),

        //            TotalCO2 = reader.IsDBNull(reader.GetOrdinal("TotalCO2")) ? 0 :
        //                       reader.GetDecimal(reader.GetOrdinal("TotalCO2")),

        //            TotalNO2 = reader.IsDBNull(reader.GetOrdinal("TotalNO2")) ? 0 :
        //                       reader.GetDecimal(reader.GetOrdinal("TotalNO2")),

        //            TotalCH4 = reader.IsDBNull(reader.GetOrdinal("TotalCH4")) ? 0 :
        //                       reader.GetDecimal(reader.GetOrdinal("TotalCH4")),

        //            TotalEmission = reader.IsDBNull(reader.GetOrdinal("TotalEmission")) ? 0 :
        //                                 reader.GetDecimal(reader.GetOrdinal("TotalEmission")),

        //            StatusId = reader.IsDBNull(reader.GetOrdinal("StatusId")) ? 0 :
        //                       reader.GetInt32(reader.GetOrdinal("StatusId"))
        //        };

        //        result.Add(dto);
        //    }

        //    await reader.CloseAsync();

        //    int totalRecords = totalParam.Value != DBNull.Value
        //        ? (int)totalParam.Value
        //        : result.Count;

        //    return (result, totalRecords);
        //}

        public async Task<PageResult> GetMyActionTripsAsync(int pageNumber, int pageSize, string sortColumn = "EntryDate", string sortDirection = "DESC")
    {
            int userId = GetCurrentUserId();
            int roleId = _userContext.Role.Contains("Corporate") ? 3 : 5;

            var result = new List<ResponseVehicleTripEmissionDTO>();
            int totalRecords = 0;

            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();

                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "USP_CB_GetMyActionVehicleTrips";
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add(new SqlParameter("@UserId", userId));
                    cmd.Parameters.Add(new SqlParameter("@RoleId", roleId));
                    cmd.Parameters.Add(new SqlParameter("@PageNumber", pageNumber));
                    cmd.Parameters.Add(new SqlParameter("@PageSize", pageSize));
                    cmd.Parameters.Add(new SqlParameter("@SortColumn", sortColumn));
                    cmd.Parameters.Add(new SqlParameter("@SortDirection", sortDirection));

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        // FIRST RESULT SET (Trip Data)
                        while (await reader.ReadAsync())
                        {
                            result.Add(new ResponseVehicleTripEmissionDTO
                            {
                                TripId = _idEncoder.Encode(Convert.ToInt32(reader["TripId"])),
                                ReportId = reader["ReportId"]?.ToString(),
                                VehicleId = _idEncoder.Encode(Convert.ToInt32(reader["VehicleId"])),

                                FromCityId = reader["FromCityId"] == DBNull.Value
                                    ? null
                                    : _idEncoder.Encode(Convert.ToInt32(reader["FromCityId"])),

                                ToCityId = reader["ToCityId"] == DBNull.Value
                                    ? null
                                    : _idEncoder.Encode(Convert.ToInt32(reader["ToCityId"])),

                                TripStartDateTime = Convert.ToDateTime(reader["TripStartDateTime"]),

                                TripEndDateTime = reader["TripEndDateTime"] == DBNull.Value
                                    ? null
                                    : Convert.ToDateTime(reader["TripEndDateTime"]),

                                DistanceKm = Convert.ToDecimal(reader["DistanceKm"]),
                                FuelConsumedLtr = Convert.ToDecimal(reader["FuelConsumedLtr"]),

                                CO2 = reader["CO2"] == DBNull.Value ? null : Convert.ToDecimal(reader["CO2"]),
                                NO2 = reader["NO2"] == DBNull.Value ? null : Convert.ToDecimal(reader["NO2"]),
                                CH4 = reader["CH4"] == DBNull.Value ? null : Convert.ToDecimal(reader["CH4"]),

                                TotalCO2 = reader["TotalCO2"] == DBNull.Value ? null : Convert.ToDecimal(reader["TotalCO2"]),
                                TotalNO2 = reader["TotalNO2"] == DBNull.Value ? null : Convert.ToDecimal(reader["TotalNO2"]),
                                TotalCH4 = reader["TotalCH4"] == DBNull.Value ? null : Convert.ToDecimal(reader["TotalCH4"]),
                                TotalEmission = reader["TotalEmission"] == DBNull.Value ? null : Convert.ToDecimal(reader["TotalEmission"]),
                                EntryDate = reader["EntryDate"] == DBNull.Value
                                 ? null
                                : Convert.ToDateTime(reader["EntryDate"]),

                                EntryBy = reader["EntryBy"] == DBNull.Value
                                    ? null
                                 : Convert.ToInt32(reader["EntryBy"]),
                                VehicleNumber = reader["VehicleNumber"]?.ToString(),
                                VehicleType = reader["VehicleType"]?.ToString(),
                                FuelType = reader["FuelType"]?.ToString(),

                                FromCity = reader["FromCity"]?.ToString(),
                                ToCity = reader["ToCity"]?.ToString(),

                                StatusId = Convert.ToInt32(reader["StatusId"])
                            });
                        }
                        if (await reader.NextResultAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                totalRecords = Convert.ToInt32(reader["TotalRecords"]);
                            }
                        }
                    }
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

        public async Task<(IEnumerable<SearchVehicleTripEmissionDTO>, int)> SearchVehicleTrips(
            string? search,
            string? vehicleNumber,
            List<string>? fuelType,
           List<string>? vehicleType,
            DateTime? startDate,
            DateTime? endDate,
            int? statusId,
            string? userRole,
            int pageNumber = 1,
            int pageSize = 10,
            string sortColumn = "tripstartdatetime",
            string sortDirection = "DESC")
        {
            int userId = GetCurrentUserId();
            string role = _userContext.Role;

            var result = new List<SearchVehicleTripEmissionDTO>();
            int totalRecords = 0;

            string? fuelTypeCsv = (fuelType != null && fuelType.Count > 0)
        ? string.Join(",", fuelType)
        : null;

            string? vehicleTypeCsv = (vehicleType != null && vehicleType.Count > 0)
                ? string.Join(",", vehicleType)
                : null;

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_SearchVehicleTripEmission";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@Search", (object?)search ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@VehicleNumber", (object?)vehicleNumber ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@FuelType", (object?)fuelTypeCsv ?? DBNull.Value));  
            command.Parameters.Add(new SqlParameter("@VehicleType", (object?)vehicleTypeCsv ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@StartDate", (object?)startDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@EndDate", (object?)endDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@EntryStartDate", DBNull.Value));
            command.Parameters.Add(new SqlParameter("@EntryEndDate", DBNull.Value));
            command.Parameters.Add(new SqlParameter("@StatusId", (object?)statusId ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@UserId", userId));
            command.Parameters.Add(new SqlParameter("@UserRole", role));
            command.Parameters.Add(new SqlParameter("@PageNumber", pageNumber));
            command.Parameters.Add(new SqlParameter("@PageSize", pageSize));
            command.Parameters.Add(new SqlParameter("@SortColumn", sortColumn));
            command.Parameters.Add(new SqlParameter("@SortDirection", sortDirection));

            var totalParam = new SqlParameter("@TotalRecords", SqlDbType.Int)
            {
                Direction = ParameterDirection.Output
            };
            command.Parameters.Add(totalParam);

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            await using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                result.Add(new SearchVehicleTripEmissionDTO
                {
                    TripId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("TripId"))),
                    ReportId = reader["ReportId"]?.ToString(),
                    VehicleNumber = reader["VehicleNumber"]?.ToString() ?? "",
                    VehicleType = reader["VehicleType"]?.ToString() ?? "",
                    FuelType = reader["FuelType"]?.ToString() ?? "",

                    EntryDate = reader.IsDBNull(reader.GetOrdinal("EntryDate"))
                        ? DateTime.MinValue
                        : reader.GetDateTime(reader.GetOrdinal("EntryDate")),

                    DistanceKm = reader.IsDBNull(reader.GetOrdinal("DistanceKm"))
                        ? 0 : reader.GetDecimal(reader.GetOrdinal("DistanceKm")),

                    FuelConsumedLtr = reader.IsDBNull(reader.GetOrdinal("FuelConsumedLtr"))
                        ? 0 : reader.GetDecimal(reader.GetOrdinal("FuelConsumedLtr")),

                    TripStartDateTime = reader.GetDateTime(reader.GetOrdinal("TripStartDateTime")),

                    TripEndDateTime = reader.IsDBNull(reader.GetOrdinal("TripEndDateTime"))
                        ? DateTime.MinValue
                        : reader.GetDateTime(reader.GetOrdinal("TripEndDateTime")),

                    TotalCO2 = reader.IsDBNull(reader.GetOrdinal("TotalCO2"))
                        ? 0 : reader.GetDecimal(reader.GetOrdinal("TotalCO2")),

                    TotalNO2 = reader.IsDBNull(reader.GetOrdinal("TotalNO2"))
                        ? 0 : reader.GetDecimal(reader.GetOrdinal("TotalNO2")),

                    TotalCH4 = reader.IsDBNull(reader.GetOrdinal("TotalCH4"))
                        ? 0 : reader.GetDecimal(reader.GetOrdinal("TotalCH4")),

                    TotalEmission = reader.IsDBNull(reader.GetOrdinal("TotalEmission"))
                        ? 0 : reader.GetDecimal(reader.GetOrdinal("TotalEmission")),

                    StatusId = reader.IsDBNull(reader.GetOrdinal("StatusId"))
                        ? 0 : reader.GetInt32(reader.GetOrdinal("StatusId"))
                });
            }

            await reader.CloseAsync();

            totalRecords = totalParam.Value != DBNull.Value
                ? (int)totalParam.Value
                : result.Count;

            return (result, totalRecords);
        }

        public async Task<List<WorkflowActionDTO>> GetWorkflowActionsAsync(string encryptedId)
        {
            int tripId = _idEncoder.Decode(encryptedId);

           
            int statusId = await _context.CB_VehicleTripEmissions
                .Where(x => x.tripid == tripId && x.isactive)
                .Select(x => x.StatusId)
                .FirstOrDefaultAsync();

            if (statusId == 0)
                return new List<WorkflowActionDTO>(); // No trip or inactive

            
            string role = _userContext.Role.Contains("Corporate") ? "Corporate" : "Reporter";

            int roleId = await _context.CB_Roles
                .Where(r => r.RoleName == role)
                .Select(r => r.RoleId)
                .FirstOrDefaultAsync();

            if (roleId == 0)
                throw new Exception($"Role '{role}' not found in DB");

          
            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GetWorkflowActions";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@StatusId", statusId));
            command.Parameters.Add(new SqlParameter("@RoleId", roleId));

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var actions = new List<WorkflowActionDTO>();

            await using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                actions.Add(new WorkflowActionDTO
                {
                    WorkflowId = reader.GetInt32(reader.GetOrdinal("WorkflowId")),
                    CurrentStatusId = reader.GetInt32(reader.GetOrdinal("CurrentStatusId")),
                    NextStatusId = reader.GetInt32(reader.GetOrdinal("NextStatusId")),
                    ActionName = reader["ActionName"]?.ToString(),
                    RoleName = reader["RoleName"]?.ToString()
                });
            }

            return actions;
        }

        public async Task<(List<ResponseVehicleTripEmissionDTO> Data, int TotalRecords)> GetAllAsync()
        {
            int userId = GetCurrentUserId();
            string role = _userContext.Role.Contains("Corporate") ? "Corporate" : "Reporter";

            var result = new List<ResponseVehicleTripEmissionDTO>();
            int totalRecords = 0;

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GetVehicleTripEmission";
            command.CommandType = CommandType.StoredProcedure;


            command.Parameters.Add(new SqlParameter("@UserId", userId));
            command.Parameters.Add(new SqlParameter("@UserRole", role));

            var totalParam = new SqlParameter("@TotalRecords", SqlDbType.Int)
            {
                Direction = ParameterDirection.Output
            };
            command.Parameters.Add(totalParam);

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            await using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                result.Add(new ResponseVehicleTripEmissionDTO
                {
                    TripId = _idEncoder.Encode(Convert.ToInt32(reader["TripId"])),
                    ReportId = reader["ReportId"]?.ToString(),
                    VehicleId = _idEncoder.Encode(Convert.ToInt32(reader["VehicleId"])),

                    FromCityId = _idEncoder.Encode(Convert.ToInt32(reader["FromCityId"])),
                    ToCityId = _idEncoder.Encode(Convert.ToInt32(reader["ToCityId"])),

                    FromCity = reader["FromCity"]?.ToString(),
                    ToCity = reader["ToCity"]?.ToString(),

                    VehicleNumber = reader["VehicleName"]?.ToString(),
                    VehicleType = reader["VehicleType"]?.ToString(),
                    FuelType = reader["FuelType"]?.ToString(),

                    TripStartDateTime = Convert.ToDateTime(reader["TripStartDateTime"]),

                    TripEndDateTime = reader["TripEndDateTime"] == DBNull.Value
                        ? null
                        : Convert.ToDateTime(reader["TripEndDateTime"]),

                    DistanceKm = Convert.ToDecimal(reader["DistanceKm"]),
                    FuelConsumedLtr = Convert.ToDecimal(reader["FuelConsumedLtr"]),

                    CO2 = reader["CO2"] == DBNull.Value ? null : Convert.ToDecimal(reader["CO2"]),
                    NO2 = reader["NO2"] == DBNull.Value ? null : Convert.ToDecimal(reader["NO2"]),
                    CH4 = reader["CH4"] == DBNull.Value ? null : Convert.ToDecimal(reader["CH4"]),

                    TotalCO2 = reader["TotalCO2"] == DBNull.Value ? null : Convert.ToDecimal(reader["TotalCO2"]),
                    TotalNO2 = reader["TotalNO2"] == DBNull.Value ? null : Convert.ToDecimal(reader["TotalNO2"]),
                    TotalCH4 = reader["TotalCH4"] == DBNull.Value ? null : Convert.ToDecimal(reader["TotalCH4"]),

                    TotalEmission = reader["TotalEmission"] == DBNull.Value
                    ? null
                    : Convert.ToDecimal(reader["TotalEmission"]),

                    EntryBy = reader["EntryBy"] == DBNull.Value ? null : Convert.ToInt32(reader["EntryBy"]),
                    EntryDate = reader["EntryDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["EntryDate"]),

                    StatusId = Convert.ToInt32(reader["StatusId"])
                });
            }

            await reader.CloseAsync();


            totalRecords = totalParam.Value != DBNull.Value
                ? (int)totalParam.Value
                : result.Count;

            return (result, totalRecords);
        }

        private void EncodeIds(Dictionary<string, object> data)
        {
            if (data == null) return;

            var keys = data.Keys.ToList();

            foreach (var key in keys)
            {
                if (key.EndsWith("Id") && data[key] != null)
                {
                    if (int.TryParse(data[key].ToString(), out int id))
                    {
                        data[key] = _idEncoder.Encode(id);
                    }
                }
            }
        }

        //    public async Task<byte[]> ExportVehicleTripsExcel(
        //string? search,
        //string? fuelType,
        //DateTime? startDate,
        //DateTime? endDate,
        //DateTime? entryStartDate,
        //DateTime? entryEndDate,
        //string sortColumn,
        //string sortDirection)
        //    {

        //        var (data, total) = await SearchVehicleTrips(
        //            search,
        //            null,
        //            fuelType,
        //            null,
        //            startDate,
        //            endDate,
        //            null,
        //            null,
        //            1,
        //            100000, 
        //            sortColumn,
        //            sortDirection
        //        );

        //        var columns = new Dictionary<string, string>
        //        {
        //            {"Vehicle No", "VehicleNumber"},
        //            {"Vehicle Type", "VehicleType"},
        //            {"Fuel Type", "FuelType"},
        //            {"Entry Date", "EntryDate"},
        //            {"Distance (KM)", "DistanceKm"},
        //            {"Fuel Used (Ltr)", "FuelConsumedLtr"},
        //            {"Start Date", "TripStartDateTime"},
        //            {"End Date", "TripEndDateTime"},
        //            {"Total Emission", "TotalEmission"}
        //        };

        //        return await ExcelExportHelper.ExportToExcelAsync(data, columns, "Emission Report");
        //    }


        public async Task<byte[]> ExportVehicleTripsExcel(
      string? search,
       List<string>? fuelType,
    List<string>? vehicleType,
      DateTime? startDate,
      DateTime? endDate,
      DateTime? entryStartDate,
      DateTime? entryEndDate,
      string sortColumn,
      string sortDirection)
        {
            (IEnumerable<SearchVehicleTripEmissionDTO> data, int total) = await SearchVehicleTrips(
        search,
        null,
        fuelType,       
        vehicleType,    
        startDate,
        endDate,
        null,
        null,
        1,
        100000,
        sortColumn,
        sortDirection
    );

            var columns = new Dictionary<string, string>
    {
        {"Vehicle No", "VehicleNumber"},
        {"Vehicle Type", "VehicleType"},
        {"Fuel Type", "FuelType"},
        {"Entry Date", "EntryDate"},
        {"Distance (KM)", "DistanceKm"},
        {"Fuel Used (Ltr)", "FuelConsumedLtr"},
        {"Start Date", "TripStartDateTime"},
        {"End Date", "TripEndDateTime"},
        {"Total Emission", "TotalEmission"}
    };

            return await ExcelExportHelper.ExportToExcelAsync(
                data,
                columns,
                "Vehicle Report",
                "Vehicle Trip Emission Report"
            );
        }


        //private void EncodeIds(Dictionary<string, object> data)
        //{
        //    if (data == null) return;

        //    var keys = data.Keys.ToList();

        //    foreach (var key in keys)
        //    {
        //        if (key.EndsWith("Id") && data[key] != null)
        //        {
        //            if (int.TryParse(data[key].ToString(), out int id))
        //            {
        //                data[key] = _idEncoder.Encode(id);
        //            }
        //        }
        //    }
        //}
        private async Task<Dictionary<string, object>> ReadSingleRowAsync(SqlDataReader reader)
        {
            var row = new Dictionary<string, object>();

            if (await reader.ReadAsync())
            {
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var value = reader.GetValue(i);
                    row[reader.GetName(i)] = value == DBNull.Value ? null : value;
                }

                EncodeIds(row);
            }

            return row;
        }
        private async Task<List<Dictionary<string, object>>> ReadMultipleRowsAsync(SqlDataReader reader)
        {
            var list = new List<Dictionary<string, object>>();

            while (await reader.ReadAsync())
            {
                var row = new Dictionary<string, object>();

                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var value = reader.GetValue(i);
                    row[reader.GetName(i)] = value == DBNull.Value ? null : value;
                }

                EncodeIds(row);
                list.Add(row);
            }

            return list;
        }
        private void FormatHistoryData(List<Dictionary<string, object>> history)
        {
            foreach (var row in history)
            {
                row["FullName"] = $"{row.GetValueOrDefault("FullName")}".Trim();
                row["UserName"] = row.GetValueOrDefault("UserName") ?? "-";
                row["Email"] = row.GetValueOrDefault("Email") ?? "-";
                row["Status"] = row.GetValueOrDefault("Status") ?? "-";
                row["ActionName"] = row.GetValueOrDefault("ActionName") ?? "-";
            }
        }
        private void FormatTripData(Dictionary<string, object> trip)
        {
            if (trip == null || trip.Count == 0) return;

            // Full Name fallback
            trip["EntryByFullName"] =
                $"{trip.GetValueOrDefault("EntryByFullName")}".Trim();

            // Safe string conversions
            trip["vehicle_number"] = trip.GetValueOrDefault("vehicle_number") ?? "-";
            trip["FromCity"] = trip.GetValueOrDefault("FromCity") ?? "-";
            trip["ToCity"] = trip.GetValueOrDefault("ToCity") ?? "-";
            trip["Status"] = trip.GetValueOrDefault("Status") ?? "-";

            // Numeric formatting
            trip["DistanceKm"] = trip.GetValueOrDefault("DistanceKm") ?? 0;
            trip["FuelConsumedLtr"] = trip.GetValueOrDefault("FuelConsumedLtr") ?? 0;

            // Emission formatting
            trip["TotalEmission"] = trip.GetValueOrDefault("TotalEmission") ?? 0;
        }

        public async Task<byte[]> GenerateVehicleTripPdf(string tripId)
        {
            int roleId = _userContext.Role.Contains("Corporate") ? 3 : 5;
            var data = await GetByHashIdAsyncPDF(tripId);

            var trip = data["Trip"] as Dictionary<string, object> ?? new();
            if (trip == null || trip.Count == 0)
                throw new Exception($"No trip data found for tripId: {tripId}");

            var history = data["History"] as List<Dictionary<string, object>> ?? new();

            string GetString(string key) =>
                trip.ContainsKey(key) && trip[key] != null ? trip[key].ToString() : "-";

            decimal GetDecimal(string key) =>
                trip.ContainsKey(key) && trip[key] != null ? Convert.ToDecimal(trip[key]) : 0;

            DateTime? GetDate(string key) =>
                trip.ContainsKey(key) && trip[key] != null ? Convert.ToDateTime(trip[key]) : null;

            string GetValue(Dictionary<string, object> dict, string key) =>
                dict.ContainsKey(key) && dict[key] != null ? dict[key].ToString() : "-";

            var historyRows = new StringBuilder();

            foreach (var h in history)
            {
                var actionDate = h.ContainsKey("ActionDate") && h["ActionDate"] != null
                    ? Convert.ToDateTime(h["ActionDate"]).ToString("dd MMM yyyy, HH:mm ")
                    : "-";

                var actionName = GetValue(h, "ActionName");
                var actionRole = GetValue(h, "ActionByRole");
                var fullName = GetValue(h, "FullName");
                string smartMessage = actionName.ToLower() switch
                {
                    "submit" => $"{fullName} ({actionRole}) submitted this trip for review",
                    "approve" => $"{fullName} ({actionRole}) approved this trip",
                    "reject" => $"{fullName} ({actionRole}) rejected this trip",
                    "resubmit" => $"{fullName} ({actionRole}) resubmitted this trip after corrections",
                    _ => $"{fullName} ({actionRole}) performed {actionName}"
                };
                string dotClass = actionName.ToLower() switch
                {
                    "submit" => "dot-submit",
                    "approve" => "dot-approve",
                    "reject" => "dot-reject",
                    "resubmit" => "dot-resubmit",
                    _ => "dot-default"
                };

                //// Badge CSS class
                //string badgeClass = actionName.ToLower() switch
                //{
                //    "submit" => "badge-submit",
                //    "approve" => "badge-approve",
                //    "reject" => "badge-reject",
                //    "resubmit" => "badge-resubmit",
                //    _ => "badge-default"
                //};

                historyRows.Append($@"
<div class=""timeline-item"">
    <div class=""timeline-dot-col"">
        <span class=""timeline-dot {dotClass}""></span>
    </div>
    <div class=""timeline-content"">
        <div class=""timeline-message"">{smartMessage}</div>
        <div class=""timeline-meta"">
            <span class=""timeline-date"">{actionDate}</span>
        </div>
       
    </div>
</div>");
            }


            string templateDir = Path.Combine(AppContext.BaseDirectory, "Template", "VehicleTrip");
            string css = await File.ReadAllTextAsync(Path.Combine(templateDir, "styles.css"));
            string contentHtml = await File.ReadAllTextAsync(Path.Combine(templateDir, "VehicleTripReport.html"));
            string headerHtml = await File.ReadAllTextAsync(Path.Combine(templateDir, "header.html"));
            string footerHtml = await File.ReadAllTextAsync(Path.Combine(templateDir, "footer.html"));

            string cssTag = $"<style>{css}</style>";

            contentHtml = contentHtml.Replace("</head>", $"{cssTag}</head>");
            headerHtml = headerHtml.Replace("</head>", $"{cssTag}</head>");
            footerHtml = footerHtml.Replace("</head>", $"{cssTag}</head>");

            string entryDateStr = GetDate("EntryDate")?.ToString("dd-MMM-yyyy HH:mm ")
                      ?? DateTime.Now.ToString("dd-MMM-yyyy HH:mm ");


            headerHtml = headerHtml.Replace("{{ReportTitle}}", "Fleet &amp; Transport Emission Report");
            headerHtml = headerHtml.Replace("{{EntryDate}}", entryDateStr);
            headerHtml = headerHtml.Replace("{{status}}", GetString("Status"));
            headerHtml = headerHtml.Replace("{{reportId}}", GetString("ReportId"));

            footerHtml = footerHtml.Replace("{{generatedDate}}", DateTime.Now.ToString("dd-MMM-yyyy HH:mm"));

            contentHtml = contentHtml.Replace("{{EntryByFullName}}", GetString("EntryByFullName"));
            contentHtml = contentHtml.Replace("{{EntryByUserName}}", GetString("EntryByUserName"));
            contentHtml = contentHtml.Replace("{{EntryByEmail}}", GetString("EntryByEmail"));
            contentHtml = contentHtml.Replace("{{status}}", GetString("Status"));
            contentHtml = contentHtml.Replace("{{EntryDate}}", entryDateStr);
            contentHtml = contentHtml.Replace("{{tripId}}", GetString("ReportId"));

            contentHtml = contentHtml.Replace("{{vehicle}}", GetString("vehicle_number"));
            contentHtml = contentHtml.Replace("{{VehicleType}}", GetString("VehicleType"));
            contentHtml = contentHtml.Replace("{{fuelType}}", GetString("FuelTypeName"));
            contentHtml = contentHtml.Replace("{{fromCity}}", GetString("FromCity"));
            contentHtml = contentHtml.Replace("{{toCity}}", GetString("ToCity"));
            contentHtml = contentHtml.Replace("{{distance}}", GetDecimal("DistanceKm").ToString("0.##"));
            contentHtml = contentHtml.Replace("{{fuel}}", GetDecimal("FuelConsumedLtr").ToString("0.##"));

            contentHtml = contentHtml.Replace("{{tripstartdate}}",
                GetDate("TripStartDateTime")?.ToString("dd-MMM-yyyy HH:mm") ?? "-");
            contentHtml = contentHtml.Replace("{{tripenddate}}",
                GetDate("TripEndDateTime")?.ToString("dd-MMM-yyyy HH:mm") ?? "-");

            var start = GetDate("TripStartDateTime");
            var end = GetDate("TripEndDateTime");
            string duration = "-";
            if (start != null && end != null)
            {
                var diff = end.Value - start.Value;
                duration = $"{(int)diff.TotalHours} hrs {diff.Minutes} mins";
            }
            contentHtml = contentHtml.Replace("{{tripduration}}", duration);

            var fuel = GetDecimal("FuelConsumedLtr");
            var co2Factor = GetDecimal("CO2Factor");
            var no2Factor = GetDecimal("NO2Factor");
            var ch4Factor = GetDecimal("CH4Factor");

            var co2 = fuel * co2Factor;
            var no2 = fuel * no2Factor;
            var ch4 = fuel * ch4Factor;
            var total = co2 + (ch4 * 28) + (no2 * 265);

            contentHtml = contentHtml.Replace("{{co2Factor}}", co2Factor.ToString("0.########"));
            contentHtml = contentHtml.Replace("{{no2Factor}}", no2Factor.ToString("0.########"));
            contentHtml = contentHtml.Replace("{{ch4Factor}}", ch4Factor.ToString("0.########"));
            contentHtml = contentHtml.Replace("{{co2}}", co2.ToString("0.######"));
            contentHtml = contentHtml.Replace("{{no2}}", no2.ToString("0.######"));
            contentHtml = contentHtml.Replace("{{ch4}}", ch4.ToString("0.######"));
            contentHtml = contentHtml.Replace("{{total}}", total.ToString("0.######"));
            contentHtml = contentHtml.Replace("{{GWP_CH4}}", "28");
            contentHtml = contentHtml.Replace("{{GWP_N2O}}", "265");
            contentHtml = contentHtml.Replace("{{historyRows}}", historyRows.ToString());
            using var browser = await Puppeteer.LaunchAsync(new LaunchOptions
            {
                Headless = true,
                Args = new[] { "--no-sandbox", "--disable-setuid-sandbox" }
            });

            using var page = await browser.NewPageAsync();

            await page.SetContentAsync(contentHtml, new PuppeteerSharp.NavigationOptions
            {
                WaitUntil = new[] { WaitUntilNavigation.Networkidle0 }
            });

            var pdf = await page.PdfDataAsync(new PdfOptions
            {
                Format = PaperFormat.A4,
                PrintBackground = true,
                DisplayHeaderFooter = true,
                HeaderTemplate = headerHtml,
                FooterTemplate = footerHtml,
                MarginOptions = new MarginOptions
                {
                    Top = "90px",
                    Bottom = "70px",
                    Left = "25px",
                    Right = "25px"

                }
            });

            await browser.CloseAsync();
            return pdf;
        }

        public async Task<Dictionary<string, object>> GetByHashIdAsyncPDF(string hashId)
        {
            int tripId = _idEncoder.Decode(hashId);
            int roleId = _userContext.Role.Contains("Corporate") ? 3 : 5;
            var result = new Dictionary<string, object>();

            using (SqlConnection conn = new SqlConnection(_context.Database.GetConnectionString()))
            {
                await conn.OpenAsync();

                using (SqlCommand cmd = new SqlCommand("USP_CB_GetVehicleTripFullDetails", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@TripId", tripId);
                    cmd.Parameters.AddWithValue("@RoleId", roleId);

                    using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                    {
                        var trip = await ReadSingleRowAsync(reader);
                        FormatTripData(trip);
                        result["Trip"] = trip;

                        await reader.NextResultAsync();
                        var actions = await ReadMultipleRowsAsync(reader);
                        result["Actions"] = actions;

                        await reader.NextResultAsync();
                        var history = await ReadMultipleRowsAsync(reader);
                        FormatHistoryData(history);
                        result["History"] = history;
                    }
                }
            }

            return result;

        }
    }

}
    

