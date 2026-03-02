using AutoMapper;
using Microsoft.AspNetCore.Mvc;
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
                return null;

            int generatorId = _idEncoder.Decode(dto.GeneratorId);

            if (generatorId == 0)
                throw new Exception("Invalid Generator Id");

            if (dto.EndTime <= dto.StartTime)
                throw new Exception("End Time must be greater than Start Time");

            int userId = GetCurrentUserId();

            // Execute Stored Procedure
            var result = await _context.CB_GeneratorOperations
                .FromSqlRaw(
                    @"EXEC USP_CB_GeneratorOperationInsert 
                @GeneratorId={0},
                @OperationDate={1},
                @StartTime={2},
                @EndTime={3},
                @LoadFactor={4},
                @FuelConsumedLiters={5},
                @UserId={6}",
                    generatorId,
                    dto.OperationDate,
                    dto.StartTime,
                    dto.EndTime,
                    dto.LoadFactor,
                    dto.FuelConsumedLiters,
                    userId
                )
                .AsNoTracking()
                .ToListAsync();

            // Stored procedure returns inserted ID
            var insertedId = result.FirstOrDefault()?.OperationId;

            if (insertedId == null || insertedId == 0)
                throw new Exception("Insert failed");

            // Fetch inserted record (optional but recommended)
            var insertedEntity = await _context.CB_GeneratorOperations
                .FirstOrDefaultAsync(x => x.OperationId == insertedId);

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

        public async Task<bool> DeleteAsync(string encryptedId)
        {
            if (string.IsNullOrEmpty(encryptedId))
                return false;

            int id = _idEncoder.Decode(encryptedId);
            int userId = GetCurrentUserId();

            var rows = await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_GeneratorOperationDelete @OperationId={0}, @UpdatedBy={1}",
                id, userId);

            return rows > 0;
        }
    }
}
