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
            var list = await _context.CB_GeneratorOperations
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.OperationDate)
                .ToListAsync();

            return list.Select(x => new GeneratorOperationResponseDTO
            {
                OperationId = _idEncoder.Encode(x.OperationId),
                GeneratorId = _idEncoder.Encode(x.GeneratorId),

                OperationDate = x.OperationDate,
                RunHours = x.RunHours ?? 0,
                LoadFactor = x.LoadFactor ?? 0,
                PowerOutputKWH = x.PowerOutputKWH ?? 0,
                FuelConsumedLiters = x.FuelConsumedLiters ?? 0,

                TotalCO2 = x.total_co2_kg ?? 0,
                TotalNO2 = x.total_no2_kg ?? 0,
                TotalCH4 = x.total_ch4_kg ?? 0,
                TotalEmission = x.total_co2e_kg ?? 0,

                StatusId = x.StatusId,
                EntryBy = x.EntryBy,
                EntryDate = x.EntryDate
            }).ToList();
        }





        public async Task<GeneratorOperationResponseDTO> CreateAsync(
     GeneratorOperationCreateDTO dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            int generatorId = _idEncoder.Decode(dto.GeneratorId);
            int userId = GetCurrentUserId();

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GeneratorOperationInsert";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@GeneratorId", generatorId));
            command.Parameters.Add(new SqlParameter("@StartTime", dto.StartTime));
            command.Parameters.Add(new SqlParameter("@EndTime", dto.EndTime));
            command.Parameters.Add(new SqlParameter("@LoadFactor", dto.LoadFactor));
            command.Parameters.Add(new SqlParameter("@FuelConsumedLiters", dto.FuelConsumedLiters));
            command.Parameters.Add(new SqlParameter("@UserId", userId));

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var result = await command.ExecuteScalarAsync();
            int insertedId = Convert.ToInt32(result);

            return await GetByIdAsync(_idEncoder.Encode(insertedId));

        }


        public async Task<GeneratorOperationResponseDTO> GetByIdAsync(string encryptedId)
        {
            if (string.IsNullOrEmpty(encryptedId))
                return null;

            int id = _idEncoder.Decode(encryptedId);

            var list = await _context.CB_GeneratorOperations
                .FromSqlRaw("EXEC USP_CB_GeneratorOperationGetById @OperationId={0}", id)
                .AsNoTracking()
                .ToListAsync();

            var entity = list.FirstOrDefault();

            if (entity == null)
                return null;

            return new GeneratorOperationResponseDTO
            {
                OperationId = _idEncoder.Encode(entity.OperationId),
                GeneratorId = _idEncoder.Encode(entity.GeneratorId),

                OperationDate = entity.OperationDate,
                RunHours = entity.RunHours ?? 0,
                LoadFactor = entity.LoadFactor ?? 0,
                PowerOutputKWH = entity.PowerOutputKWH ?? 0,
                FuelConsumedLiters = entity.FuelConsumedLiters ?? 0,


                TotalCO2 = entity.total_co2_kg ?? 0,
                TotalNO2 = entity.total_no2_kg ?? 0,
                TotalCH4 = entity.total_ch4_kg ?? 0,
                TotalEmission = entity.total_co2e_kg ?? 0,

                StatusId = entity.StatusId,

                EntryBy = entity.EntryBy,
                EntryDate = entity.EntryDate
            };

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

            command.CommandText = "USP_CB_GeneratorOperationUpdateStatus";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@OperationId", id));
            command.Parameters.Add(new SqlParameter("@StatusId", statusId));
            command.Parameters.Add(new SqlParameter("@UpdatedBy", userId));

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var result = await command.ExecuteScalarAsync();

            int rows = result != null ? Convert.ToInt32(result) : 0;

            return rows > 0;
        }

        private string GetCurrentUserRole()
        {
            if (_userContext == null)
                throw new Exception("User context is not initialized");

            return _userContext.Role; // assuming Role property exists
        }

        public async Task<List<GeneratorOperationResponseDTO>> SearchAsync(
    string search = null,
    string fuelType = null,
    string generatorName = null,
    DateTime? startDate = null,
    DateTime? endDate = null,
    int? statusId = null,
    int pageNumber = 1,
    int pageSize = 10,
    string sortColumn = "OperationDate",
    string sortDirection = "DESC")
        {
            int userId = GetCurrentUserId();
            string role = _userContext.Role; // FIXED (instead of GetCurrentUserRole)

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
            command.Parameters.Add(new SqlParameter("@SortColumn", sortColumn));
            command.Parameters.Add(new SqlParameter("@SortDirection", sortDirection));

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var reader = await command.ExecuteReaderAsync();

            var result = new List<GeneratorOperationResponseDTO>();

            while (await reader.ReadAsync())
            {
                result.Add(new GeneratorOperationResponseDTO
                {
                    OperationId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("OperationId"))),
                    GeneratorId = _idEncoder.Encode(reader.GetInt32(reader.GetOrdinal("GeneratorId"))),

                    OperationDate = DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("OperationDate"))),
                    RunHours = reader.GetDecimal(reader.GetOrdinal("RunHours")),
                    LoadFactor = reader.GetDecimal(reader.GetOrdinal("LoadFactor")),
                    PowerOutputKWH = reader.GetDecimal(reader.GetOrdinal("PowerOutputKWH")),
                    FuelConsumedLiters = reader.GetDecimal(reader.GetOrdinal("FuelConsumedLiters")),

                    TotalCO2 = reader.GetDecimal(reader.GetOrdinal("total_co2_kg")),
                    TotalNO2 = reader.GetDecimal(reader.GetOrdinal("total_no2_kg")),
                    TotalCH4 = reader.GetDecimal(reader.GetOrdinal("total_ch4_kg")),
                    TotalEmission = reader.GetDecimal(reader.GetOrdinal("total_co2e_kg")),

                    StatusId = reader.GetInt32(reader.GetOrdinal("StatusId")),

                    EntryBy = reader.GetInt32(reader.GetOrdinal("EntryBy")),
                    EntryDate = reader.GetDateTime(reader.GetOrdinal("EntryDate")),

                    GeneratorName = reader["GeneratorName"]?.ToString(),
                    FuelType = reader["FuelType"]?.ToString()
                });
            }

            return result;
        }
    }
}