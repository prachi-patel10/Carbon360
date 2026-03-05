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
                 .FromSqlRaw("EXEC USP_CB_GeneratorOperationGetAllList")
                 .AsNoTracking()
                 .ToListAsync();

            if (list == null || !list.Any())
                return new List<GeneratorOperationResponseDTO>();

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

                //GeneratorName = x.GeneratorName,
                //RatedCapacityKW = x.RatedCapacityKW ?? 0,

                EntryBy = x.EntryBy,
                EntryDate = x.EntryDate,
                StatusId = x.StatusId
            })
            .OrderByDescending(x => x.OperationDate)
            .ToList();

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
              
                TotalEmission = updatedEntity.total_co2e_kg ?? 0,
                StatusId = updatedEntity.StatusId, // ✅ include
                EntryBy = updatedEntity.EntryBy,
                EntryDate = updatedEntity.EntryDate
            };

            //return response; // ✅ guaranteed return

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
    }
}
