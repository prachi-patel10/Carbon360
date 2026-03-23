using AutoMapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Account.GeneratorOperation;
using ProjectApp.Core.DTOs.Common;
using ProjectApp.Core.DTOs.Masters.Generator;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.GenerationOperation;
using ProjectApp.Repository.Interfaces.SiteLocation;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Services.Common;
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
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;

namespace ProjectApp.Repository.Services.GeneratorOperation
{
    public class GeneratorOperationService : BaseService<CB_GeneratorOperation>, IGeneratorOperationService
    {
        private readonly ISiteLocationService _siteService;
        private readonly CBContext _context;
        private readonly IMapper _mapper;
        private readonly IdEncoder _idEncoder;
        private readonly ISPService _spService;


        public GeneratorOperationService(
            IMapper mapper,
            ICommonService<CB_GeneratorOperation> common,
            CBContext context,
            IUserContext userContext,
            IdEncoder idEncoder,
            ISiteLocationService siteService,
            ISPService spService
        ) : base(common, mapper, userContext)
        {
            _context = context;
            _mapper = mapper;
            _idEncoder = idEncoder;
            _siteService = siteService;
            _spService = spService;
        }


        // ================= GET ALL =================
        public async Task<List<GeneratorOperationResponseDTO>> GetAllAsync()
        {
            var result = await _spService.ExecuteSpAsync("USP_CB_GeneratorOperationGetAllList");

            var dataList = (result["Data"] as IEnumerable<object>)
                            ?.Cast<Dictionary<string, object>>()
                            ?.ToList()
                            ?? new List<Dictionary<string, object>>();

            var list = new List<GeneratorOperationResponseDTO>();

            foreach (var row in dataList)
            {
                list.Add(new GeneratorOperationResponseDTO
                {
                    OperationId = _idEncoder.Encode(Convert.ToInt32(row["OperationId"])),
                    GeneratorId = _idEncoder.Encode(Convert.ToInt32(row["GeneratorId"])),
                    SiteId = row["SiteId"] != DBNull.Value ? _idEncoder.Encode(Convert.ToInt32(row["SiteId"])) : null,
                    SiteName = row["SiteName"]?.ToString(),
                    GeneratorName = row["GeneratorName"]?.ToString(),
                    FuelType = row["FuelType"]?.ToString(),
                    OperationDate = DateOnly.FromDateTime(Convert.ToDateTime(row["OperationDate"])),
                    StartTime = Convert.ToDateTime(row["StartTime"]),
                    EndTime = Convert.ToDateTime(row["EndTime"]),
                    RunHours = row["RunHours"] != DBNull.Value ? Convert.ToDecimal(row["RunHours"]) : 0,
                    LoadFactor = row["LoadFactor"] != DBNull.Value ? Convert.ToDecimal(row["LoadFactor"]) : 0,
                    PowerOutputKWH = row["PowerOutputKWH"] != DBNull.Value ? Convert.ToDecimal(row["PowerOutputKWH"]) : 0,
                    FuelConsumedLiters = row["FuelConsumedLiters"] != DBNull.Value ? Convert.ToDecimal(row["FuelConsumedLiters"]) : 0,
                    CO2 = row["co2Factor"] != DBNull.Value ? Convert.ToDecimal(row["co2Factor"]) : 0,
                    NO2 = row["no2Factor"] != DBNull.Value ? Convert.ToDecimal(row["no2Factor"]) : 0,
                    CH4 = row["ch4Factor"] != DBNull.Value ? Convert.ToDecimal(row["ch4Factor"]) : 0,
                    TotalCO2 = row["totalCO2"] != DBNull.Value ? Convert.ToDecimal(row["totalCO2"]) : 0,
                    TotalNO2 = row["totalNO2"] != DBNull.Value ? Convert.ToDecimal(row["totalNO2"]) : 0,
                    TotalCH4 = row["totalCH4"] != DBNull.Value ? Convert.ToDecimal(row["totalCH4"]) : 0,
                    TotalEmission = row["totalEmission"] != DBNull.Value ? Convert.ToDecimal(row["totalEmission"]) : 0,
                    StatusId = row["StatusId"] != DBNull.Value ? Convert.ToInt32(row["StatusId"]) : 0,
                    EntryBy = row["EntryBy"] != DBNull.Value ? Convert.ToInt32(row["EntryBy"]) : 0,
                    EntryDate = row["EntryDate"] != DBNull.Value ? Convert.ToDateTime(row["EntryDate"]) : DateTime.MinValue
                });
            }

            return list;
        }

        // ================= GET BY ID =================
        public async Task<GeneratorOperationResponseDTO> GetByIdAsync(string encryptedId)
        {
            if (string.IsNullOrEmpty(encryptedId))
                return null;

            int operationId = _idEncoder.Decode(encryptedId);

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GeneratorOperationGetById";
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.Add(new SqlParameter("@OperationId", operationId));

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            GeneratorOperationResponseDTO dto = null;

            await using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                int? siteId = null;
                string siteName = null;

                // Optional: if your table has SiteId column
                if (!reader.IsDBNull(reader.GetOrdinal("SiteId")))
                {
                    siteId = reader.GetInt32(reader.GetOrdinal("SiteId"));
                    siteName = await _siteService.GetSiteNameByIdAsync(siteId.Value);
                }

                dto = new GeneratorOperationResponseDTO
                {
                    OperationId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("OperationId"))),
                    GeneratorId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("GeneratorId"))),
                    SiteId = siteId.HasValue ? _idEncoder.Encode(siteId.Value) : null,
                    SiteName = siteName,
                    GeneratorName = reader["GeneratorName"]?.ToString(),
                    FuelType = reader["FuelType"]?.ToString(),
                    OperationDate = DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("OperationDate"))),
                    StartTime = reader.GetDateTime(reader.GetOrdinal("StartTime")),
                    EndTime = reader.GetDateTime(reader.GetOrdinal("EndTime")),
                    RunHours = reader.IsDBNull(reader.GetOrdinal("RunHours")) ? 0 : reader.GetDecimal(reader.GetOrdinal("RunHours")),
                    LoadFactor = reader.IsDBNull(reader.GetOrdinal("LoadFactor")) ? 0 : reader.GetDecimal(reader.GetOrdinal("LoadFactor")),
                    PowerOutputKWH = reader.IsDBNull(reader.GetOrdinal("PowerOutputKWH")) ? 0 : reader.GetDecimal(reader.GetOrdinal("PowerOutputKWH")),
                    FuelConsumedLiters = reader.IsDBNull(reader.GetOrdinal("FuelConsumedLiters")) ? 0 : reader.GetDecimal(reader.GetOrdinal("FuelConsumedLiters")),
                    CO2 = reader.IsDBNull(reader.GetOrdinal("CO2")) ? 0 : reader.GetDecimal(reader.GetOrdinal("CO2")),
                    NO2 = reader.IsDBNull(reader.GetOrdinal("NO2")) ? 0 : reader.GetDecimal(reader.GetOrdinal("NO2")),
                    CH4 = reader.IsDBNull(reader.GetOrdinal("CH4")) ? 0 : reader.GetDecimal(reader.GetOrdinal("CH4")),
                    TotalCO2 = reader.IsDBNull(reader.GetOrdinal("TotalCO2")) ? 0 : reader.GetDecimal(reader.GetOrdinal("TotalCO2")),
                    TotalNO2 = reader.IsDBNull(reader.GetOrdinal("TotalNO2")) ? 0 : reader.GetDecimal(reader.GetOrdinal("TotalNO2")),
                    TotalCH4 = reader.IsDBNull(reader.GetOrdinal("TotalCH4")) ? 0 : reader.GetDecimal(reader.GetOrdinal("TotalCH4")),
                    TotalEmission = reader.IsDBNull(reader.GetOrdinal("TotalEmission")) ? 0 : reader.GetDecimal(reader.GetOrdinal("TotalEmission")),
                    StatusId = reader.IsDBNull(reader.GetOrdinal("StatusId")) ? 0 : reader.GetInt32(reader.GetOrdinal("StatusId")),
                    EntryBy = reader.IsDBNull(reader.GetOrdinal("EntryBy")) ? 0 : reader.GetInt32(reader.GetOrdinal("EntryBy")),
                    EntryDate = reader.IsDBNull(reader.GetOrdinal("EntryDate")) ? DateTime.MinValue : reader.GetDateTime(reader.GetOrdinal("EntryDate"))
                };
            }

            await reader.CloseAsync();
            return dto;
        }
        // ================= CREATE =================
        public async Task<GeneratorOperationResponseDTO> CreateAsync(GeneratorOperationCreateDTO dto)
        {
            var userId = GetCurrentUserId();
            int generatorId = _idEncoder.Decode(dto.GeneratorId);
            int siteId = _idEncoder.Decode(dto.SiteId);
            int roleId = _userContext.Role.Contains("Corporate") ? 3 : 5;

            var parameters = new[]
            {
                new SqlParameter("@GeneratorId", generatorId),
                new SqlParameter("@SiteId", siteId),
                new SqlParameter("@StartTime", dto.StartTime),
                new SqlParameter("@EndTime", dto.EndTime),
                new SqlParameter("@LoadFactor", dto.LoadFactor),
                new SqlParameter("@FuelConsumedLiters", dto.FuelConsumedLiters),
                new SqlParameter("@UserId", userId),
                new SqlParameter("@RoleId", roleId)
            };

            var result = await _context.CB_GeneratorOperations
                .FromSqlRaw(
                    "EXEC USP_CB_GeneratorOperationInsert @GeneratorId,@SiteId,@StartTime,@EndTime,@LoadFactor,@FuelConsumedLiters,@UserId,@RoleId",
                    parameters)
                .ToListAsync();

            var entity = result.FirstOrDefault();
            if (entity == null) throw new Exception("Generator operation record not created.");

            var siteName = entity.SiteId.HasValue
                ? await _siteService.GetSiteNameByIdAsync(entity.SiteId.Value)
                : null;

            var siteIdEncoded = entity.SiteId.HasValue
                ? _idEncoder.Encode(entity.SiteId.Value)
                : null;

            return new GeneratorOperationResponseDTO
            {
                OperationId = _idEncoder.Encode(entity.OperationId),
                GeneratorId = _idEncoder.Encode(entity.GeneratorId),
                SiteId = siteIdEncoded,
                SiteName = siteName,
                OperationDate = entity.OperationDate,
                RunHours = entity.RunHours ?? 0,
                LoadFactor = entity.LoadFactor ?? 0,
                PowerOutputKWH = entity.PowerOutputKWH ?? 0,
                FuelConsumedLiters = entity.FuelConsumedLiters ?? 0,
                CO2 = entity.co2_kg,
                NO2 = entity.no2_kg,
                CH4 = entity.ch4_kg,
                TotalCO2 = entity.total_co2_kg ?? 0,
                TotalNO2 = entity.total_no2_kg ?? 0,
                TotalCH4 = entity.total_ch4_kg ?? 0,
                TotalEmission = entity.total_co2e_kg ?? 0,
                StatusId = entity.StatusId,
                EntryBy = entity.EntryBy,
                EntryDate = entity.EntryDate
            };
        }



        // ================= DELETE =================
        public async Task<bool> DeleteAsync(string encryptedId)
        {
            if (string.IsNullOrEmpty(encryptedId))
                return false;

            int id = _idEncoder.Decode(encryptedId);
            int userId = GetCurrentUserId();

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GeneratorOperationDelete";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@OperationId", SqlDbType.Int) { Value = id });
            command.Parameters.Add(new SqlParameter("@UpdatedBy", SqlDbType.Int) { Value = userId });

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var result = await command.ExecuteScalarAsync();
            int rows = result != null ? Convert.ToInt32(result) : 0;

            return rows > 0;
        }

        public async Task<bool> UpdateStatusAsync(string encryptedId, int workflowId)
        {
            int operationId = _idEncoder.Decode(encryptedId);
            int userId = GetCurrentUserId();
            int roleId = _userContext.Role.Contains("Corporate") ? 3 : 5;

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GeneratorUpdateStatus";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@OperationId", operationId));
            command.Parameters.Add(new SqlParameter("@WorkflowId", workflowId));
            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.Int) { Value = userId });
            command.Parameters.Add(new SqlParameter("@RoleId", SqlDbType.Int) { Value = roleId });


            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            await command.ExecuteNonQueryAsync();
            return true;
        }

        // ================= SEARCH =================

        public async Task<GeneratorOperationPagedResponseDTO> SearchAsync(
     string search,
     string fuelTypes,       // already comma-separated string e.g. "Diesel,Petrol"
     string generatorName,
     DateTime? startDate,
     DateTime? endDate,
      DateTime? entryStartDate,
    DateTime? entryEndDate,
     int? statusId,
     int pageNumber,
     int pageSize)
        {
            var result = new GeneratorOperationPagedResponseDTO();

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_SearchGeneratorOperation";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@Search", (object)search ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@GeneratorName", (object)generatorName ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@FuelTypes", (object)fuelTypes ?? DBNull.Value));  // pass as-is
            command.Parameters.Add(new SqlParameter("@StartDate", (object)startDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@EndDate", (object)endDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@EntryStartDate", (object)entryStartDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@EntryEndDate", (object)entryEndDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@StatusId", (object)statusId ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@UserId", GetCurrentUserId()));
            command.Parameters.Add(new SqlParameter("@UserRole", _userContext.Role ?? "Reporter"));
            command.Parameters.Add(new SqlParameter("@PageNumber", pageNumber));
            command.Parameters.Add(new SqlParameter("@PageSize", pageSize));

            var totalParam = new SqlParameter("@TotalRecords", SqlDbType.Int)
            {
                Direction = ParameterDirection.Output
            };
            command.Parameters.Add(totalParam);

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            await using var reader = await command.ExecuteReaderAsync();
            var records = new List<GeneratorOperationResponseDTO>();

            while (await reader.ReadAsync())
            {
                records.Add(new GeneratorOperationResponseDTO
                {
                    OperationId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("OperationId"))),
                    GeneratorId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("GeneratorId"))),
                    GeneratorName = reader["GeneratorName"]?.ToString(),
                    FuelType = reader["FuelType"]?.ToString(),
                    SiteId = reader.IsDBNull(reader.GetOrdinal("SiteId"))
                        ? null
                        : _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("SiteId"))),
                    SiteName = reader.IsDBNull(reader.GetOrdinal("SiteName"))
                        ? null
                        : reader.GetString(reader.GetOrdinal("SiteName")),
                    OperationDate = DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("OperationDate"))),
                    StartTime = reader.GetDateTime(reader.GetOrdinal("StartTime")),
                    EndTime = reader.GetDateTime(reader.GetOrdinal("EndTime")),
                    RunHours = reader.IsDBNull(reader.GetOrdinal("RunHours")) ? 0 : reader.GetDecimal(reader.GetOrdinal("RunHours")),
                    LoadFactor = reader.IsDBNull(reader.GetOrdinal("LoadFactor")) ? 0 : reader.GetDecimal(reader.GetOrdinal("LoadFactor")),
                    PowerOutputKWH = reader.IsDBNull(reader.GetOrdinal("PowerOutputKWH")) ? 0 : reader.GetDecimal(reader.GetOrdinal("PowerOutputKWH")),
                    FuelConsumedLiters = reader.IsDBNull(reader.GetOrdinal("FuelConsumedLiters")) ? 0 : reader.GetDecimal(reader.GetOrdinal("FuelConsumedLiters")),
                    CO2 = reader.IsDBNull(reader.GetOrdinal("CO2_KG")) ? null : reader.GetDecimal(reader.GetOrdinal("CO2_KG")),
                    NO2 = reader.IsDBNull(reader.GetOrdinal("NO2_KG")) ? null : reader.GetDecimal(reader.GetOrdinal("NO2_KG")),
                    CH4 = reader.IsDBNull(reader.GetOrdinal("CH4_KG")) ? null : reader.GetDecimal(reader.GetOrdinal("CH4_KG")),
                    TotalCO2 = reader.IsDBNull(reader.GetOrdinal("Total_CO2_KG")) ? 0 : reader.GetDecimal(reader.GetOrdinal("Total_CO2_KG")),
                    TotalNO2 = reader.IsDBNull(reader.GetOrdinal("Total_NO2_KG")) ? 0 : reader.GetDecimal(reader.GetOrdinal("Total_NO2_KG")),
                    TotalCH4 = reader.IsDBNull(reader.GetOrdinal("Total_CH4_KG")) ? 0 : reader.GetDecimal(reader.GetOrdinal("Total_CH4_KG")),
                    TotalEmission = reader.IsDBNull(reader.GetOrdinal("Total_CO2E_KG")) ? 0 : reader.GetDecimal(reader.GetOrdinal("Total_CO2E_KG")),
                    StatusId = reader.IsDBNull(reader.GetOrdinal("StatusId")) ? 0 : reader.GetInt32(reader.GetOrdinal("StatusId")),
                    EntryBy = reader.IsDBNull(reader.GetOrdinal("EntryBy")) ? 0 : reader.GetInt32(reader.GetOrdinal("EntryBy")),
                    EntryDate = reader.IsDBNull(reader.GetOrdinal("EntryDate")) ? DateTime.MinValue : reader.GetDateTime(reader.GetOrdinal("EntryDate"))
                });
            }

            // Close reader BEFORE reading output parameter
            await reader.CloseAsync();

            result.Records = records;
            result.TotalRecords = totalParam.Value != DBNull.Value ? (int)totalParam.Value : 0;

            return result;
        }

        public async Task<List<GeneratorResponseDTO>> GetBySiteIdAsync(int siteId)
        {
            // Assuming you have a DbSet<CB_Generator> _context.CB_Generators
            var generators = await _context.CB_MasterGenerators
                .Where(g => g.SiteId == siteId && g.IsActive) // filter active generators only
                .Select(g => new GeneratorResponseDTO
                {
                    GeneratorId = _idEncoder.Encode(g.GeneratorId),
                    GeneratorName = g.GeneratorName,
                    FuelName = g.Fuel.fuel_name
                })
                .ToListAsync();

            return generators;
        }

        public async Task<List<WorkflowActionDTO>> GetWorkflowActionsAsync(string encryptedId)
        {
            int operationId = _idEncoder.Decode(encryptedId);

            // :one: Get current StatusId
            int statusId = await _context.CB_GeneratorOperations
.Where(x => x.OperationId == operationId)
.Select(x => x.StatusId)
.FirstOrDefaultAsync();

            if (statusId == 0)
                return new List<WorkflowActionDTO>(); // No trip or inactive

            // :two: Map role string to RoleId
            string role = _userContext.Role.Contains("Corporate") ? "Corporate" : "Reporter";

            int roleId = await _context.CB_Roles
            .Where(r => r.RoleName == role)
            .Select(r => r.RoleId)
            .FirstOrDefaultAsync();

            if (roleId == 0)
                throw new Exception($"Role '{role}' not found in DB");

            // :three: Call stored procedure with correct parameters
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

        public async Task<GeneratorOperationResponseDTO> UpdateAsync(string encryptedId, GenerationOperationUpdateDTO dto)
        {
            int operationId = _idEncoder.Decode(encryptedId);
            int siteId = _idEncoder.Decode(dto.SiteId);
            int userId = GetCurrentUserId();

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GeneratorOperationUpdate";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@OperationId", SqlDbType.Int) { Value = operationId });
            command.Parameters.Add(new SqlParameter("@SiteId", SqlDbType.Int) { Value = siteId });
            command.Parameters.Add(new SqlParameter("@StartTime", SqlDbType.DateTime) { Value = dto.StartTime });
            command.Parameters.Add(new SqlParameter("@EndTime", SqlDbType.DateTime) { Value = dto.EndTime });

            command.Parameters.Add(new SqlParameter("@LoadFactor", SqlDbType.Decimal)
            {
                Precision = 5,
                Scale = 2,
                Value = dto.LoadFactor
            });

            command.Parameters.Add(new SqlParameter("@FuelConsumedLiters", SqlDbType.Decimal)
            {
                Precision = 10,
                Scale = 2,
                Value = dto.FuelConsumedLiters
            });

            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.Int) { Value = userId });

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            await command.ExecuteNonQueryAsync();

            var updatedEntity = await _context.CB_GeneratorOperations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OperationId == operationId);

            if (updatedEntity == null)
                throw new Exception("Generator operation not found.");

            var siteName = updatedEntity.SiteId.HasValue
                ? await _siteService.GetSiteNameByIdAsync(updatedEntity.SiteId.Value)
                : null;

            var siteIdEncoded = updatedEntity.SiteId.HasValue
                ? _idEncoder.Encode(updatedEntity.SiteId.Value)
                : null;

            return new GeneratorOperationResponseDTO
            {
                OperationId = _idEncoder.Encode(updatedEntity.OperationId),
                GeneratorId = _idEncoder.Encode(updatedEntity.GeneratorId),
                SiteId = siteIdEncoded,
                SiteName = siteName,

                OperationDate = updatedEntity.OperationDate,
                StartTime = updatedEntity.StartTime,
                EndTime = updatedEntity.EndTime,

                RunHours = updatedEntity.RunHours ?? 0,
                LoadFactor = updatedEntity.LoadFactor ?? 0,
                PowerOutputKWH = updatedEntity.PowerOutputKWH ?? 0,
                FuelConsumedLiters = updatedEntity.FuelConsumedLiters ?? 0,

                CO2 = updatedEntity.co2_kg,
                NO2 = updatedEntity.no2_kg,
                CH4 = updatedEntity.ch4_kg,

                TotalCO2 = updatedEntity.total_co2_kg ?? 0,
                TotalNO2 = updatedEntity.total_no2_kg ?? 0,
                TotalCH4 = updatedEntity.total_ch4_kg ?? 0,
                TotalEmission = updatedEntity.total_co2e_kg ?? 0,

                StatusId = updatedEntity.StatusId,
                EntryBy = updatedEntity.EntryBy,
                EntryDate = updatedEntity.EntryDate
            };

        }

        public async Task<GeneratorOperationPagedResponseDTO> GetMyActionRecordsAsync(
     int pageNumber, int pageSize, string sortColumn, string sortDirection)
        {
            int userId = GetCurrentUserId();
            string role = _userContext.Role.Contains("Corporate") ? "Corporate"
                : _userContext.Role.Contains("Admin") ? "Admin"
                : "Reporter";

            int roleId = await _context.CB_Roles
                .Where(r => r.RoleName == role)
                .Select(r => r.RoleId)
                .FirstOrDefaultAsync();

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GetMyActionRecords";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@UserId", userId));
            command.Parameters.Add(new SqlParameter("@RoleId", roleId));
            command.Parameters.Add(new SqlParameter("@PageNumber", pageNumber));
            command.Parameters.Add(new SqlParameter("@PageSize", pageSize));
            command.Parameters.Add(new SqlParameter("@SortColumn", sortColumn ?? "EntryDate"));
            command.Parameters.Add(new SqlParameter("@SortDirection", sortDirection ?? "DESC"));

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var list = new List<GeneratorOperationResponseDTO>();

            await using var reader = await command.ExecuteReaderAsync();

            // First result set — records
            while (await reader.ReadAsync())
            {
                list.Add(new GeneratorOperationResponseDTO
                {
                    OperationId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("OperationId"))),
                    GeneratorId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("GeneratorId"))),

                    SiteId = reader.IsDBNull(reader.GetOrdinal("SiteId"))
                        ? null
                        : _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("SiteId"))),

                    GeneratorName = reader["GeneratorName"]?.ToString(),
                    FuelType = reader["FuelType"]?.ToString(),

                    OperationDate = DateOnly.FromDateTime(
                        reader.GetDateTime(reader.GetOrdinal("OperationDate"))),

                    RunHours = reader.IsDBNull(reader.GetOrdinal("RunHours")) ? 0 :
                               Convert.ToDecimal(reader["RunHours"]),

                    LoadFactor = reader.IsDBNull(reader.GetOrdinal("LoadFactor")) ? 0 :
                                 Convert.ToDecimal(reader["LoadFactor"]),

                    FuelConsumedLiters = reader.IsDBNull(reader.GetOrdinal("FuelConsumedLiters")) ? 0 :
                                         Convert.ToDecimal(reader["FuelConsumedLiters"]),

                    TotalCO2 = reader.IsDBNull(reader.GetOrdinal("totalCO2")) ? 0 :
                               Convert.ToDecimal(reader["totalCO2"]),

                    TotalNO2 = reader.IsDBNull(reader.GetOrdinal("totalNO2")) ? 0 :
                               Convert.ToDecimal(reader["totalNO2"]),

                    TotalCH4 = reader.IsDBNull(reader.GetOrdinal("totalCH4")) ? 0 :
                               Convert.ToDecimal(reader["totalCH4"]),

                    TotalEmission = reader.IsDBNull(reader.GetOrdinal("totalEmission")) ? 0 :
                                    Convert.ToDecimal(reader["totalEmission"]),

                    GWP_CH4 = reader.IsDBNull(reader.GetOrdinal("gwP_CH4")) ? 0 :
                              Convert.ToDecimal(reader["gwP_CH4"]),

                    GWP_NO2 = reader.IsDBNull(reader.GetOrdinal("gwP_NO2")) ? 0 :
                              Convert.ToDecimal(reader["gwP_NO2"]),

                    StatusId = reader.GetInt32(reader.GetOrdinal("StatusId")),
                    EntryBy = reader.GetInt32(reader.GetOrdinal("EntryBy")),
                    EntryDate = reader.GetDateTime(reader.GetOrdinal("EntryDate"))
                });
            }

            // Second result set — total records
            int totalRecords = 0;
            if (await reader.NextResultAsync() && await reader.ReadAsync())
                totalRecords = reader.GetInt32(0);

            return new GeneratorOperationPagedResponseDTO
            {
                Records = list,
                TotalRecords = totalRecords
            };
        }

        private void FormatOperationData(Dictionary<string, object> operation)
        {
            if (operation == null || operation.Count == 0) return;

            operation["EntryByFullName"] = $"{operation.GetValueOrDefault("EntryByFullName")}".Trim();
            operation["GeneratorName"] = operation.GetValueOrDefault("GeneratorName") ?? "-";
            operation["SiteName"] = operation.GetValueOrDefault("SiteName") ?? "-";
            operation["FuelTypeName"] = operation.GetValueOrDefault("FuelTypeName") ?? "-";
            operation["Status"] = operation.GetValueOrDefault("Status") ?? "-";
            operation["FuelConsumedLiters"] = operation.GetValueOrDefault("FuelConsumedLiters") ?? 0;
            operation["total_co2e_kg"] = operation.GetValueOrDefault("total_co2e_kg") ?? 0;
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
                row["ActionByRole"] = row.GetValueOrDefault("ActionByRole") ?? "-";
            }
        }
        public async Task<Dictionary<string, object>> GetByHashIdAsyncPDF(string hashId)
        {
            int operationId = _idEncoder.Decode(hashId);
            int roleId = _userContext.Role.Contains("Corporate") ? 3 : 5;

            var result = new Dictionary<string, object>();

            using (SqlConnection conn = new SqlConnection(_context.Database.GetConnectionString()))
            {
                await conn.OpenAsync();

                using (SqlCommand cmd = new SqlCommand("USP_CB_GetGeneratorOperationFullDetails", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@OperationId", operationId);
                    cmd.Parameters.AddWithValue("@RoleId", roleId);

                    using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                    {
                        var operation = await ReadSingleRowAsync(reader);
                        FormatOperationData(operation);
                        result["Operation"] = operation;

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


        public async Task<byte[]> GenerateGeneratorOperationPdf(string operationId)
        {
            var data = await GetByHashIdAsyncPDF(operationId);

            var operation = data["Operation"] as Dictionary<string, object> ?? new();
            if (operation == null || operation.Count == 0)
                throw new Exception($"No operation data found for operationId: {operationId}");

            Console.WriteLine($"Operation keys: {string.Join(", ", operation.Keys)}");

            var history = data["History"] as List<Dictionary<string, object>> ?? new();

            string GetString(string key) =>
                operation.ContainsKey(key) && operation[key] != null ? operation[key].ToString() : "-";

            decimal GetDecimal(string key) =>
                operation.ContainsKey(key) && operation[key] != null ? Convert.ToDecimal(operation[key]) : 0;

            DateTime? GetDate(string key) =>
                operation.ContainsKey(key) && operation[key] != null ? Convert.ToDateTime(operation[key]) : null;

            var historyRows = new StringBuilder();
            foreach (var h in history)
            {
                var actionDate = h.ContainsKey("ActionDate") && h["ActionDate"] != null
                    ? Convert.ToDateTime(h["ActionDate"]).ToString("dd-MMM-yyyy HH:mm")
                    : "-";

                historyRows.Append($@"
<tr>
    <td>{actionDate}</td>
    <td>{GetValue(h, "ActionName")}</td>
    <td>{GetValue(h, "ActionByRole")}</td>
    <td>{GetValue(h, "FullName")}</td>
</tr>");
            }

            string templateDir = Path.Combine(AppContext.BaseDirectory, "Template", "VehicleTrip");
            string css = await File.ReadAllTextAsync(Path.Combine(templateDir, "styles.css"));
            string contentHtml = await File.ReadAllTextAsync(Path.Combine(templateDir, "GeneratorReport.html"));
            string headerHtml = await File.ReadAllTextAsync(Path.Combine(templateDir, "header.html"));
            string footerHtml = await File.ReadAllTextAsync(Path.Combine(templateDir, "footer.html"));

            string cssTag = $"<style>{css}</style>";
            contentHtml = contentHtml.Replace("</head>", $"{cssTag}</head>");
            headerHtml = headerHtml.Replace("</head>", $"{cssTag}</head>");
            footerHtml = footerHtml.Replace("</head>", $"{cssTag}</head>");

            contentHtml = contentHtml.Replace("{{EntryByFullName}}", GetString("EntryByFullName"));
            contentHtml = contentHtml.Replace("{{EntryByUserName}}", GetString("EntryByUserName"));
            contentHtml = contentHtml.Replace("{{EntryByEmail}}", GetString("EntryByEmail"));
            contentHtml = contentHtml.Replace("{{status}}", GetString("Status"));
            contentHtml = contentHtml.Replace("{{operationId}}", operationId);

            contentHtml = contentHtml.Replace("{{generatorName}}", GetString("GeneratorName"));
            contentHtml = contentHtml.Replace("{{ratedCapacity}}", GetDecimal("RatedCapacityKW").ToString("0.##"));
            contentHtml = contentHtml.Replace("{{fuelType}}", GetString("FuelTypeName"));
            contentHtml = contentHtml.Replace("{{siteName}}", GetString("SiteName"));
            contentHtml = contentHtml.Replace("{{operationDate}}",
                GetDate("OperationDate")?.ToString("dd-MMM-yyyy") ?? "-");
            contentHtml = contentHtml.Replace("{{startTime}}",
                GetDate("StartTime")?.ToString("dd-MMM-yyyy HH:mm") ?? "-");
            contentHtml = contentHtml.Replace("{{endTime}}",
                GetDate("EndTime")?.ToString("dd-MMM-yyyy HH:mm") ?? "-");

            contentHtml = contentHtml.Replace("{{runHours}}", GetDecimal("RunHours").ToString("0.##"));
            contentHtml = contentHtml.Replace("{{loadFactor}}", GetDecimal("LoadFactor").ToString("0.##"));
            contentHtml = contentHtml.Replace("{{powerOutputKWH}}", GetDecimal("PowerOutputKWH").ToString("0.##"));
            contentHtml = contentHtml.Replace("{{fuelConsumed}}", GetDecimal("FuelConsumedLiters").ToString("0.##"));

            var co2Factor = GetDecimal("CO2Factor");
            var no2Factor = GetDecimal("NO2Factor");
            var ch4Factor = GetDecimal("CH4Factor");
            var fuelConsumed = GetDecimal("FuelConsumedLiters");

            var co2 = fuelConsumed * co2Factor;
            var no2 = fuelConsumed * no2Factor;
            var ch4 = fuelConsumed * ch4Factor;
            var total = co2 + (ch4 * 28) + (no2 * 265);

            contentHtml = contentHtml.Replace("{{co2Factor}}", co2Factor.ToString("0.########"));
            contentHtml = contentHtml.Replace("{{no2Factor}}", no2Factor.ToString("0.########"));
            contentHtml = contentHtml.Replace("{{ch4Factor}}", ch4Factor.ToString("0.########"));
            contentHtml = contentHtml.Replace("{{co2}}", co2.ToString("0.##"));
            contentHtml = contentHtml.Replace("{{no2}}", no2.ToString("0.######"));
            contentHtml = contentHtml.Replace("{{ch4}}", ch4.ToString("0.######"));
            contentHtml = contentHtml.Replace("{{total}}", total.ToString("0.##"));
            contentHtml = contentHtml.Replace("{{GWP_CH4}}", "28");
            contentHtml = contentHtml.Replace("{{GWP_N2O}}", "265");

            var start = GetDate("StartTime");
            var end = GetDate("EndTime");
            string duration = "-";
            if (start != null && end != null)
            {
                var diff = end.Value - start.Value;
                int totalHours = (int)diff.TotalHours;
                int minutes = diff.Minutes;
                duration = $"{totalHours} hrs {minutes} mins";
            }
            contentHtml = contentHtml.Replace("{{duration}}", duration);

            contentHtml = contentHtml.Replace("{{historyRows}}", historyRows.ToString());

            headerHtml = headerHtml.Replace("{{ReportTitle}}", "Generator Operation Emission Report");
            footerHtml = footerHtml.Replace("{{generatedDate}}", DateTime.Now.ToString("dd-MMM-yyyy HH:mm"));

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

            string GetValue(Dictionary<string, object> dict, string key)
            {
                return dict.ContainsKey(key) && dict[key] != null ? dict[key].ToString() : "-";
            }
        }


        public async Task<List<GeneratorOperationResponseDTO>> ExportToExcelAsync(
        string search,
        string fuelTypes,
        string generatorName,
        DateTime? startDate,
        DateTime? endDate,
        DateTime? entryStartDate,
        DateTime? entryEndDate,
        int? statusId)
        {
            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_SearchGeneratorOperation";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@Search", (object)search ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@GeneratorName", (object)generatorName ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@FuelTypes", (object)fuelTypes ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@StartDate", (object)startDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@EndDate", (object)endDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@EntryStartDate", (object)entryStartDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@EntryEndDate", (object)entryEndDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@StatusId", (object)statusId ?? DBNull.Value));

            command.Parameters.Add(new SqlParameter("@UserId", GetCurrentUserId()));
            command.Parameters.Add(new SqlParameter("@UserRole", _userContext.Role ?? "Reporter"));

            command.Parameters.Add(new SqlParameter("@PageNumber", 1));
            command.Parameters.Add(new SqlParameter("@PageSize", int.MaxValue));
            command.Parameters.Add(new SqlParameter("@IsExport", 1));

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var list = new List<GeneratorOperationResponseDTO>();

            var totalParam = new SqlParameter("@TotalRecords", SqlDbType.Int)
            {
                Direction = ParameterDirection.Output
            };
            command.Parameters.Add(totalParam);

            await using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new GeneratorOperationResponseDTO
                {
                    GeneratorName = reader["GeneratorName"]?.ToString(),
                    FuelType = reader["FuelType"]?.ToString(),

                    EntryDate = reader.IsDBNull(reader.GetOrdinal("EntryDate"))
                        ? DateTime.MinValue
                        : reader.GetDateTime(reader.GetOrdinal("EntryDate")),

                    StartTime = reader.IsDBNull(reader.GetOrdinal("StartTime"))
                        ? DateTime.MinValue
                        : reader.GetDateTime(reader.GetOrdinal("StartTime")),

                    EndTime = reader.IsDBNull(reader.GetOrdinal("EndTime"))
                        ? DateTime.MinValue
                        : reader.GetDateTime(reader.GetOrdinal("EndTime")),

                    FuelConsumedLiters = reader.IsDBNull(reader.GetOrdinal("FuelConsumedLiters"))
                        ? 0
                        : reader.GetDecimal(reader.GetOrdinal("FuelConsumedLiters")),

                    LoadFactor = reader.IsDBNull(reader.GetOrdinal("LoadFactor"))
                        ? 0
                        : reader.GetDecimal(reader.GetOrdinal("LoadFactor")),

                    TotalEmission = reader.IsDBNull(reader.GetOrdinal("Total_CO2E_KG"))
                        ? 0
                        : reader.GetDecimal(reader.GetOrdinal("Total_CO2E_KG"))
                });
            }
            return list;
        }

    }
}