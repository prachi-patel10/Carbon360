using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using ProjectApp.Core.DTOs.Account.GeneratorOperation;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.GenerationOperation;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Utilities.Auth;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.GeneratorOperation
{
    public class GeneratorOperationService : BaseService<CB_GeneratorOperation>, IGeneratorOperationService
    {
        private readonly CBContext _context;
        private readonly IMapper _mapper;
        private readonly IdEncoder _idEncoder;

        public GeneratorOperationService(
            IMapper mapper,
            ICommonService<CB_GeneratorOperation> common,
            CBContext context,
            IUserContext userContext,
            IdEncoder idEncoder
        ) : base(common, mapper, userContext)
        {
            _context = context;
            _mapper = mapper;
            _idEncoder = idEncoder;
        }

        public async Task<List<GeneratorOperationResponseDTO>> GetAllAsync()
        {
            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = @"
        SELECT 
            go.OperationId,
            go.GeneratorId,
            g.GeneratorName,
            f.fuel_name  AS FuelType,
            go.OperationDate,
            go.StartTime,
            go.EndTime,
            go.RunHours,
            go.LoadFactor,
            go.PowerOutputKWH,
            go.FuelConsumedLiters,
            go.co2_kg AS CO2,
            go.no2_kg AS NO2,
            go.ch4_kg AS CH4,
            go.total_co2_kg AS TotalCO2,
            go.total_no2_kg AS TotalNO2,
            go.total_ch4_kg AS TotalCH4,
            go.total_co2e_kg AS TotalEmission,
            go.StatusId,
            go.EntryBy,
            go.EntryDate
        FROM CB_GeneratorOperation go
        INNER JOIN CB_MasterGenerator g ON go.GeneratorId = g.GeneratorId
        LEFT JOIN CB_MasterFuelType f ON g.FuelId = f.fuel_id
        WHERE go.IsDeleted = 0
        ORDER BY go.OperationDate DESC";

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var list = new List<GeneratorOperationResponseDTO>();

            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var dto = new GeneratorOperationResponseDTO
                {
                    OperationId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("OperationId"))),
                    GeneratorId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("GeneratorId"))),
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

                list.Add(dto);
            }

            await reader.CloseAsync();
            return list;
        }



        public async Task<GeneratorOperationResponseDTO> CreateAsync(
 GeneratorOperationCreateDTO dto)
        {
            var userId = GetCurrentUserId();
            int generatorId = _idEncoder.Decode(dto.GeneratorId);

            var parameters = new[]
            {
        new SqlParameter("@GeneratorId", generatorId),
        new SqlParameter("@StartTime", dto.StartTime),
        new SqlParameter("@EndTime", dto.EndTime),
        new SqlParameter("@LoadFactor", dto.LoadFactor),
        new SqlParameter("@FuelConsumedLiters", dto.FuelConsumedLiters),
        new SqlParameter("@UserId", userId)
    };

            var result = await _context.CB_GeneratorOperations
                .FromSqlRaw(
                    "EXEC USP_CB_GeneratorOperationInsert " +
                    "@GeneratorId,@StartTime,@EndTime,@LoadFactor,@FuelConsumedLiters,@UserId",
                    parameters)
                .ToListAsync();

            var entity = result.FirstOrDefault();

            if (entity == null)
                throw new Exception("Generator operation record not created.");

            return new GeneratorOperationResponseDTO
            {
                OperationId = _idEncoder.Encode(entity.OperationId),
                GeneratorId = _idEncoder.Encode(entity.GeneratorId),

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

        public async Task<GeneratorOperationResponseDTO> GetByIdAsync(string encryptedId)
        {
            if (string.IsNullOrEmpty(encryptedId))
                return null;

            int id = _idEncoder.Decode(encryptedId);

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = @"
        SELECT 
            go.OperationId,
            go.GeneratorId,
            g.GeneratorName,
            f.fuel_name  AS FuelType,
            go.OperationDate,
            go.StartTime,
            go.EndTime,
            go.RunHours,
            go.LoadFactor,
            go.PowerOutputKWH,
            go.FuelConsumedLiters,
            go.co2_kg AS CO2,
            go.no2_kg AS NO2,
            go.ch4_kg AS CH4,
            go.total_co2_kg AS TotalCO2,
            go.total_no2_kg AS TotalNO2,
            go.total_ch4_kg AS TotalCH4,
            go.total_co2e_kg AS TotalEmission,
            go.StatusId,
            go.EntryBy,
            go.EntryDate
        FROM CB_GeneratorOperation go
        INNER JOIN CB_MasterGenerator g ON go.GeneratorId = g.GeneratorId
        LEFT JOIN CB_MasterFuelType f ON g.FuelId = f.fuel_id
        WHERE go.OperationId = @OperationId AND go.IsDeleted = 0";

            command.Parameters.Add(new SqlParameter("@OperationId", id));

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            GeneratorOperationResponseDTO dto = null;

            await using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                dto = new GeneratorOperationResponseDTO
                {
                    OperationId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("OperationId"))),
                    GeneratorId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("GeneratorId"))),
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

        public async Task<GeneratorOperationResponseDTO> UpdateAsync(string encryptedId, GeneratorOperationCreateDTO dto)
        {
            int operationId = _idEncoder.Decode(encryptedId);
            int generatorId = _idEncoder.Decode(dto.GeneratorId);
            int userId = GetCurrentUserId();

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GeneratorOperationUpdate";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@OperationId", SqlDbType.Int) { Value = operationId });
            command.Parameters.Add(new SqlParameter("@GeneratorId", SqlDbType.Int) { Value = generatorId });
            command.Parameters.Add(new SqlParameter("@StartTime", SqlDbType.DateTime) { Value = dto.StartTime });
            command.Parameters.Add(new SqlParameter("@EndTime", SqlDbType.DateTime) { Value = dto.EndTime });
            command.Parameters.Add(new SqlParameter("@LoadFactor", SqlDbType.Decimal) { Precision = 5, Scale = 2, Value = dto.LoadFactor });
            command.Parameters.Add(new SqlParameter("@FuelConsumedLiters", SqlDbType.Decimal) { Precision = 10, Scale = 2, Value = dto.FuelConsumedLiters });
            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.Int) { Value = userId });

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            await command.ExecuteNonQueryAsync();

            var updatedEntity = await _context.CB_GeneratorOperations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OperationId == operationId);

            return new GeneratorOperationResponseDTO
            {
                OperationId = _idEncoder.Encode(updatedEntity.OperationId),
                GeneratorId = _idEncoder.Encode(updatedEntity.GeneratorId),
                OperationDate = updatedEntity.OperationDate,
                RunHours = updatedEntity.RunHours ?? 0,
                LoadFactor = updatedEntity.LoadFactor ?? 0,
                PowerOutputKWH = updatedEntity.PowerOutputKWH ?? 0,
                FuelConsumedLiters = updatedEntity.FuelConsumedLiters ?? 0,


                TotalCO2 = updatedEntity.total_co2_kg ?? 0,
                TotalNO2 = updatedEntity.total_no2_kg ?? 0,
                TotalCH4 = updatedEntity.total_ch4_kg ?? 0,
                TotalEmission = updatedEntity.total_co2e_kg ?? 0,
                StatusId = updatedEntity.StatusId, // :white_check_mark: include
                EntryBy = updatedEntity.EntryBy,
                EntryDate = updatedEntity.EntryDate
            };

            //return response; // :white_check_mark: guaranteed return

        }

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

            command.Parameters.Add(new SqlParameter("@OperationId", SqlDbType.Int)
            { Value = id });

            command.Parameters.Add(new SqlParameter("@UpdatedBy", SqlDbType.Int)
            { Value = userId });

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var result = await command.ExecuteScalarAsync();

            int rows = result != null ? Convert.ToInt32(result) : 0;

            return rows > 0;

        }

        public async Task<bool> UpdateStatusAsync(string encryptedId, int statusId)
        {
            int id = _idEncoder.Decode(encryptedId);
            int userId = GetCurrentUserId();

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GeneratorUpdateStatus";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@OperationId", id));
            command.Parameters.Add(new SqlParameter("@StatusId", statusId));
            command.Parameters.Add(new SqlParameter("@UserId", userId));  // ✅ FIXED

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            await command.ExecuteNonQueryAsync();

            return true;
        }

        private string GetCurrentUserRole()
        {
            if (_userContext == null)
                throw new Exception("User context is not initialized");

            return _userContext.Role; // assuming Role property exists
        }

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

            var totalParam = new SqlParameter("@TotalRecords", SqlDbType.Int)
            {
                Direction = ParameterDirection.Output
            };
            command.Parameters.Add(totalParam);

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var result = new List<GeneratorOperationResponseDTO>();

            await using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                var dto = new GeneratorOperationResponseDTO
                {
                    OperationId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("OperationId"))),
                    GeneratorId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("GeneratorId"))),

                    GeneratorName = reader["GeneratorName"]?.ToString() ?? "",
                    FuelType = reader["FuelType"]?.ToString() ?? "",

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

                result.Add(dto);
            }

            await reader.CloseAsync();

            int totalRecords = totalParam.Value != DBNull.Value ? (int)totalParam.Value : result.Count;

            return new GeneratorOperationPagedResponseDTO
            {
                Records = result,
                TotalRecords = totalRecords,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }
    }
}