using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

        // ================= GET ALL =================

        public async Task<List<GeneratorOperationResponseDTO>> GetAllAsync()
        {
            var list = await _context.CB_GeneratorOperations
                .FromSqlRaw("EXEC USP_CB_GeneratorOperationGetAllList")
                .AsNoTracking()
                .ToListAsync();

            var response = _mapper.Map<List<GeneratorOperationResponseDTO>>(list);

            for (int i = 0; i < list.Count; i++)
            {
                response[i].OperationId = _idEncoder.Encode(list[i].OperationId);
            }

            return response;
        }

        // ================= CREATE =================

        public async Task<GeneratorOperationResponseDTO> CreateAsync(
            [FromBody] GeneratorOperationCreateDTO dto)
        {
            int userId = GetCurrentUserId();

            var result = await _context.Database
            .SqlQueryRaw<decimal>(
                "EXEC USP_CB_GeneratorOperationInsert @GeneratorId={0}, @OperationDate={1}, @StartTime={2}, @EndTime={3}, @LoadFactor={4}, @FuelConsumedLiters={5}, @UserId={6}",
                dto.GeneratorId,
                dto.OperationDate,
                dto.StartTime,
                dto.EndTime,
                dto.LoadFactor,
                dto.FuelConsumedLiters,
                userId)
            .ToListAsync();

            int newId = Convert.ToInt32(result.FirstOrDefault());

            //var result = await _context.Database
            //    .SqlQueryRaw<decimal>(
            //        "EXEC USP_CB_GeneratorOperationInsert @GeneratorId={0}, @OperationDate={1}, @StartTime={2}, @EndTime={3}, @LoadFactor={4}, @FuelConsumedLiters={5}, @UserId={6}",
            //        dto.GeneratorId,
            //        dto.OperationDate,
            //        dto.StartTime,
            //        dto.EndTime,
            //        dto.LoadFactor,
            //        dto.FuelConsumedLiters,
            //        userId)
            //    .ToListAsync();

            //int newId = result.FirstOrDefault();

            var entity = await _context.CB_GeneratorOperations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OperationId == newId);

            if (entity == null)
                return null;

            var response = _mapper.Map<GeneratorOperationResponseDTO>(entity);
            response.OperationId = _idEncoder.Encode(entity.OperationId);

            return response;
        }

        // ================= GET BY ID =================

        public async Task<GeneratorOperationResponseDTO> GetByIdAsync(string encryptedId)
        {
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

        // ================= DELETE =================

        public async Task<bool> DeleteAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);
            int userId = GetCurrentUserId();

            var rows = await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_GeneratorOperationDelete @OperationId={0}, @UpdatedBy={1}",
                id, userId);

            //return rows > 0;
            return true;
        }
    }
}
