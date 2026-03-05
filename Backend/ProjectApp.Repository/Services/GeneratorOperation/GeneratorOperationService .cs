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
            var data = await _commonService.GetAllAsync();

            if (data == null || !data.Any())
                return new List<GeneratorOperationResponseDTO>();

            return data.Select(x => new GeneratorOperationResponseDTO
            {
                OperationId = _idEncoder.Encode(x.OperationId),     // encode OperationId
                GeneratorId = _idEncoder.Encode(x.GeneratorId),   // encode GeneratorId as string
                OperationDate = x.OperationDate,
                RunHours = x.RunHours ?? 0,
                LoadFactor = x.LoadFactor ?? 0,
                PowerOutputKWH = x.PowerOutputKWH ?? 0,
                FuelConsumedLiters = x.FuelConsumedLiters ?? 0,

                CO2 = x.co2_kg ?? 0,                  // match DB columns
                NO2 = x.no2_kg ?? 0,
                CH4 = x.ch4_kg ?? 0,
                TotalEmission = x.total_co2e_kg ?? 0,

                EntryBy = x.EntryBy,
                EntryDate = x.EntryDate
            })
            .OrderByDescending(x => x.OperationDate)
            .ThenByDescending(x => x.OperationId)
            .ToList();

        }


        public async Task<GeneratorOperationResponseDTO> CreateAsync(
     GeneratorOperationCreateDTO dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            int generatorId = _idEncoder.Decode(dto.GeneratorId);

            if (generatorId <= 0)
                throw new Exception("Invalid Generator Id");

            if (dto.EndTime <= dto.StartTime)
                throw new Exception("End Time must be greater than Start Time");

            int userId = GetCurrentUserId();

            int insertedId;

            await using var connection = _context.Database.GetDbConnection();
            await using var command = connection.CreateCommand();

            command.CommandText = "USP_CB_GeneratorOperationInsert";
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.Add(new SqlParameter("@GeneratorId", SqlDbType.Int)
            {
                Value = generatorId
            });

            command.Parameters.Add(new SqlParameter("@StartTime", SqlDbType.DateTime)
            {
                Value = dto.StartTime
            });

            command.Parameters.Add(new SqlParameter("@EndTime", SqlDbType.DateTime)
            {
                Value = dto.EndTime
            });

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

            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.Int)
            {
                Value = userId
            });

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var result = await command.ExecuteScalarAsync();

            if (result == null || result == DBNull.Value)
                throw new Exception("Insert failed");

            insertedId = Convert.ToInt32(result);
            Console.WriteLine("Inserted ID: " + insertedId);
            var insertedEntity = await _context.CB_GeneratorOperations
     .AsNoTracking()
     .FirstOrDefaultAsync(x => x.OperationId == insertedId);

            // 🔥 FETCH GENERATOR
            var generator = await _context.CB_MasterGenerators
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.GeneratorId == insertedEntity.GeneratorId);

            if (generator == null)
                throw new Exception("Generator not found");

            // 🔥 FETCH EMISSION FACTOR
            var factor = await _context.CB_EmissionFactors
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.FuelId == generator.FuelId && x.IsActive == true);

            if (factor == null)
                throw new Exception("Emission factor not found");

            if (insertedEntity == null)
                throw new Exception("Inserted record not found");

            return new GeneratorOperationResponseDTO
            {
                OperationId = _idEncoder.Encode(insertedEntity.OperationId),
                GeneratorId = _idEncoder.Encode(insertedEntity.GeneratorId),
                OperationDate = insertedEntity.OperationDate,
                RunHours = insertedEntity.RunHours ?? 0,
                LoadFactor = insertedEntity.LoadFactor ?? 0,
                PowerOutputKWH = insertedEntity.PowerOutputKWH ?? 0,
                FuelConsumedLiters = insertedEntity.FuelConsumedLiters ?? 0,
                CO2 = insertedEntity.co2_kg ?? 0,
                NO2 = insertedEntity.no2_kg ?? 0,
                CH4 = insertedEntity.ch4_kg ?? 0,
                TotalEmission = insertedEntity.total_co2e_kg ?? 0,

                // 🔥 ADD THESE LINES
                CO2Factor = factor.CO2_Factor_KgPerL,
                //NO2Factor = factor.NO2_Factor_KgPerL,
                //CH4Factor = factor.CH4_Factor_KgPerL,
                GWP_CH4 = 28m,
                GWP_NO2 = 265m,

                EntryBy = insertedEntity.EntryBy,
                EntryDate = insertedEntity.EntryDate
            };
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

            var response = _mapper.Map<GeneratorOperationResponseDTO>(entity);
            response.OperationId = _idEncoder.Encode(entity.OperationId);

            return response;
        }

        public async Task<GeneratorOperationResponseDTO> UpdateAsync(string encryptedId, GeneratorOperationCreateDTO dto)
        {
            if (string.IsNullOrEmpty(encryptedId) || dto == null)
                throw new ArgumentNullException(nameof(encryptedId), "Invalid data for update");

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

            // Fetch updated record
            var updatedEntity = await _context.CB_GeneratorOperations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OperationId == operationId);

            // ✅ Make sure **all paths return**
            if (updatedEntity == null)
                throw new Exception("Record not found after update.");

            var response = new GeneratorOperationResponseDTO
            {
                OperationId = _idEncoder.Encode(updatedEntity.OperationId),
                GeneratorId = _idEncoder.Encode(updatedEntity.GeneratorId),
                OperationDate = updatedEntity.OperationDate,
                RunHours = updatedEntity.RunHours ?? 0,
                LoadFactor = updatedEntity.LoadFactor ?? 0,
                PowerOutputKWH = updatedEntity.PowerOutputKWH ?? 0,
                FuelConsumedLiters = updatedEntity.FuelConsumedLiters ?? 0,
                CO2 = updatedEntity.co2_kg ?? 0,
                NO2 = updatedEntity.no2_kg ?? 0,
                CH4 = updatedEntity.ch4_kg ?? 0,
                TotalEmission = updatedEntity.total_co2e_kg ?? 0,
                EntryBy = updatedEntity.EntryBy,
                EntryDate = updatedEntity.EntryDate
            };

            return response; // ✅ guaranteed return
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
