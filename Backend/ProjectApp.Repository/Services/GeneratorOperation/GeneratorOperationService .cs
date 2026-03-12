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
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

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

            var parameters = new[]
            {
                new SqlParameter("@GeneratorId", generatorId),
                new SqlParameter("@SiteId", siteId),
                new SqlParameter("@StartTime", dto.StartTime),
                new SqlParameter("@EndTime", dto.EndTime),
                new SqlParameter("@LoadFactor", dto.LoadFactor),
                new SqlParameter("@FuelConsumedLiters", dto.FuelConsumedLiters),
                new SqlParameter("@UserId", userId)
            };

            var result = await _context.CB_GeneratorOperations
                .FromSqlRaw(
                    "EXEC USP_CB_GeneratorOperationInsert @GeneratorId,@SiteId,@StartTime,@EndTime,@LoadFactor,@FuelConsumedLiters,@UserId",
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

        // ================= UPDATE =================
        public async Task<GeneratorOperationResponseDTO> UpdateAsync(string encryptedId, GeneratorOperationCreateDTO dto)
        {
            int operationId = _idEncoder.Decode(encryptedId);
            int generatorId = _idEncoder.Decode(dto.GeneratorId);
            int siteId = _idEncoder.Decode(dto.SiteId);
            int userId = GetCurrentUserId();

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GeneratorOperationUpdate";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@OperationId", SqlDbType.Int) { Value = operationId });
            command.Parameters.Add(new SqlParameter("@StartTime", SqlDbType.DateTime) { Value = dto.StartTime });
            command.Parameters.Add(new SqlParameter("@EndTime", SqlDbType.DateTime) { Value = dto.EndTime });
            command.Parameters.Add(new SqlParameter("@LoadFactor", SqlDbType.Decimal) { Precision = 5, Scale = 2, Value = dto.LoadFactor });
            command.Parameters.Add(new SqlParameter("@FuelConsumedLiters", SqlDbType.Decimal) { Precision = 10, Scale = 2, Value = dto.FuelConsumedLiters });
            command.Parameters.Add(new SqlParameter("@SiteId", SqlDbType.Int) { Value = siteId });
            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.Int) { Value = userId });

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            await command.ExecuteNonQueryAsync();

            var updatedEntity = await _context.CB_GeneratorOperations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OperationId == operationId);
            // Encode SiteId only if it has value
            var siteIdEncoded = updatedEntity.SiteId.HasValue
                ? _idEncoder.Encode(updatedEntity.SiteId.Value)
                : null;
            var siteName = updatedEntity.SiteId.HasValue
                ? await _siteService.GetSiteNameByIdAsync(updatedEntity.SiteId.Value)
                : null;
            return new GeneratorOperationResponseDTO
            {
                OperationId = _idEncoder.Encode(updatedEntity.OperationId),
                GeneratorId = _idEncoder.Encode(updatedEntity.GeneratorId),
                SiteId = siteIdEncoded,
                SiteName = siteName,
                OperationDate = updatedEntity.OperationDate,
                RunHours = updatedEntity.RunHours ?? 0,
                LoadFactor = updatedEntity.LoadFactor ?? 0,
                PowerOutputKWH = updatedEntity.PowerOutputKWH ?? 0,
                FuelConsumedLiters = updatedEntity.FuelConsumedLiters ?? 0,
                TotalCO2 = updatedEntity.total_co2_kg ?? 0,
                TotalNO2 = updatedEntity.total_no2_kg ?? 0,
                TotalCH4 = updatedEntity.total_ch4_kg ?? 0,
                TotalEmission = updatedEntity.total_co2e_kg ?? 0,
                StatusId = updatedEntity.StatusId,
                EntryBy = updatedEntity.EntryBy,
                EntryDate = updatedEntity.EntryDate
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

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GeneratorUpdateStatus";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@OperationId", operationId));
            command.Parameters.Add(new SqlParameter("@WorkflowId", workflowId));
            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.Int) { Value = userId });


            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            await command.ExecuteNonQueryAsync();
            return true;
        }

        // ================= SEARCH =================
        public async Task<GeneratorOperationPagedResponseDTO> SearchAsync(
     string? search = null,
     string? fuelType = null,
     string? generatorName = null,
     DateTime? startDate = null,
     DateTime? endDate = null,
     int? statusId = null,
     int pageNumber = 1,
     int pageSize = 10)
        {
            int userId = GetCurrentUserId();
            string role = _userContext.Role;

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_SearchGeneratorOperation";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@Search", (object?)search ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@GeneratorName", (object?)generatorName ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@FuelType", (object?)fuelType ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@StartDate", (object?)startDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@EndDate", (object?)endDate ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@StatusId", (object?)statusId ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@UserId", userId));
            command.Parameters.Add(new SqlParameter("@UserRole", role));
            command.Parameters.Add(new SqlParameter("@PageNumber", pageNumber));
            command.Parameters.Add(new SqlParameter("@PageSize", pageSize));
            var totalRecordsParam = new SqlParameter("@TotalRecords", SqlDbType.Int)
            {
                Direction = ParameterDirection.Output
            };

            command.Parameters.Add(totalRecordsParam);

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var list = new List<GeneratorOperationResponseDTO>();

            await using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new GeneratorOperationResponseDTO
                {
                    OperationId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("OperationId"))),
                    GeneratorId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("GeneratorId"))),
                    SiteId = reader.IsDBNull(reader.GetOrdinal("SiteId"))
                        ? null
                        : _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("SiteId"))),

                    SiteName = reader["SiteName"]?.ToString(),
                    GeneratorName = reader["GeneratorName"]?.ToString(),
                    FuelType = reader["FuelType"]?.ToString(),
                    OperationDate = DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("OperationDate"))),
                    RunHours = reader.IsDBNull(reader.GetOrdinal("RunHours")) ? 0 : reader.GetDecimal(reader.GetOrdinal("RunHours")),
                    LoadFactor = reader.IsDBNull(reader.GetOrdinal("LoadFactor")) ? 0 : reader.GetDecimal(reader.GetOrdinal("LoadFactor")),
                    PowerOutputKWH = reader.IsDBNull(reader.GetOrdinal("PowerOutputKWH")) ? 0 : reader.GetDecimal(reader.GetOrdinal("PowerOutputKWH")),
                    FuelConsumedLiters = reader.IsDBNull(reader.GetOrdinal("FuelConsumedLiters")) ? 0 : reader.GetDecimal(reader.GetOrdinal("FuelConsumedLiters")),
                    StatusId = reader.IsDBNull(reader.GetOrdinal("StatusId")) ? 0 : reader.GetInt32(reader.GetOrdinal("StatusId"))
                });
            }

            await reader.CloseAsync();

            int totalRecords = totalRecordsParam.Value != DBNull.Value
                ? Convert.ToInt32(totalRecordsParam.Value)
                : 0;

            // ✅ Return using Data property
            return new GeneratorOperationPagedResponseDTO
            {
                Data = list,
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalRecords = totalRecords
            };
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
            int userId = GetCurrentUserId();
            string role = _userContext.Role.Contains("Corporate")
? "Corporate"
: "Reporter"; 

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GetWorkflowActions";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@OperationId", operationId));
            command.Parameters.Add(new SqlParameter("@RoleName", role));

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var actions = new List<WorkflowActionDTO>();
            await using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                actions.Add(new WorkflowActionDTO
                {
                    WorkflowId = reader.GetInt32(reader.GetOrdinal("WorkflowId")),
                    CurrentStatusId = reader.GetInt32(reader.GetOrdinal("currentstatusId")),
                    NextStatusId = reader.GetInt32(reader.GetOrdinal("nextstatusId")),
                    ActionName = reader["ActionName"].ToString(),
                    RoleName = reader["RoleName"].ToString()
                });
            }

            return actions;
        }
    }
    }