using AutoMapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Masters.Fuel;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.Fuel;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Utilities.Auth;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.Masters.Fuel
{
    public class FuelService : IFuelService
    {
        private readonly CBContext _context;
        private readonly ICommonService<CB_MasterFuelType> _commonService;
        private readonly IdEncoder _idEncoder;
        private readonly IUserContext _userContext;


        public FuelService(
            CBContext context,
            ICommonService<CB_MasterFuelType> commonService, IUserContext userContext)
        {
            _context = context;
            _commonService = commonService;
            _idEncoder = new IdEncoder();
            _userContext = userContext;
        
        }

        private int GetCurrentUserId()
        {
            if (_userContext == null)
                throw new Exception("User context is not initialized");

            return _userContext.UserId;
        }
        public async Task<FuelResponseDTO> CreateAsync(FuelResponseDTO dto)
        {
            var parameters = new[]
            {
                new SqlParameter("@FuelName", dto.fuel_name),
                new SqlParameter("@CO2Factor", dto.co2_factor),
                new SqlParameter("@NOxFactor", dto.nox_factor),
                new SqlParameter("@CH4Factor", dto.ch4_factor),
                new SqlParameter("@IsApplicable", dto.isapplicable),
               new SqlParameter("@EntryBy", GetCurrentUserId())
            };

            var insertedId =  _context.Database
                .SqlQueryRaw<int>(
                    "EXEC USP_CB_FuelInsert @FuelName,@CO2Factor,@NOxFactor,@CH4Factor,@IsApplicable,@EntryBy",
                    parameters)
              .AsEnumerable().FirstOrDefault();

            dto.fuel_id = _idEncoder.Encode(insertedId);

            return dto;
        }


        public async Task<IEnumerable<FuelResponseDTO>> GetAllAsync()
        {
            var data = await _context.CB_MasterFuelTypes
               .FromSqlRaw("EXEC USP_CB_FuelGetAll")
               .AsNoTracking()
               .ToListAsync();

            return data.Select(x => new FuelResponseDTO
            {
                fuel_id = _idEncoder.Encode(x.fuel_id),
                fuel_name = x.fuel_name,
                co2_factor = x.co2_factor,
                nox_factor = x.nox_factor,
                ch4_factor = x.ch4_factor,
                IsActive = x.IsActive,
                isapplicable = x.isapplicable
            });
        }

        public async Task<bool> UpdateAsync(FuelResponseDTO dto)
        {
            int id = _idEncoder.Decode(dto.fuel_id);

            var parameters = new[]
            {
                new SqlParameter("@FuelId", id),
                new SqlParameter("@FuelName", dto.fuel_name),
                new SqlParameter("@CO2Factor", dto.co2_factor),
                new SqlParameter("@NOxFactor", dto.nox_factor),
                new SqlParameter("@CH4Factor", dto.ch4_factor),
                new SqlParameter("@IsApplicable", dto.isapplicable),
               new SqlParameter("@UpdatedBy", GetCurrentUserId())
            };

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_FuelUpdate @FuelId,@FuelName,@CO2Factor,@NOxFactor,@CH4Factor,@IsApplicable,@UpdatedBy",
                parameters);

            return true;
        }

        public async Task<bool> UpdateStatusAsync(FuelStatusUpdateDTO dto)
        {
            int id = _idEncoder.Decode(dto.fuel_id);

            var fuel = await _commonService.GetAllByFilterAsync(x => x.fuel_id == id);

            if (fuel == null)
                return false;

            fuel.IsActive = dto.IsActive;
            fuel.UpdatedBy = 1;
            fuel.UpdateDate = DateTime.Now;

            await _commonService.UpdateAsync(fuel);

            return true;
        }

        public async Task<FuelResponseDTO> GetByIdAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "USP_CB_FuelGetById";
            command.CommandType = System.Data.CommandType.StoredProcedure;
            command.Parameters.Add(new SqlParameter("@FuelId", id));

            using var reader = await command.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new FuelResponseDTO
                {
                    fuel_id = encryptedId,
                    fuel_name = reader["fuel_name"].ToString(),
                    co2_factor = Convert.ToDecimal(reader["co2_factor"]),
                    nox_factor = Convert.ToDecimal(reader["nox_factor"]),
                    ch4_factor = Convert.ToDecimal(reader["ch4_factor"]),
                    IsActive = Convert.ToBoolean(reader["IsActive"])
                };
            }

            return null;
        }

        public async Task<bool> DeleteAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            var parameters = new[]
            {
                new SqlParameter("@FuelId", id),
                new SqlParameter("@UpdatedBy", GetCurrentUserId())
            };

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_FuelDelete @FuelId,@UpdatedBy",
                parameters);

            return true;
        }

        public async Task<bool> UpdateGeneratorAsync(FuelGeneratorUpdateDTO dto)
        {
            int id = _idEncoder.Decode(dto.fuel_id);

            var fuel = await _commonService.GetAllByFilterAsync(x => x.fuel_id == id);

            if (fuel == null)
                return false;

            fuel.isapplicable = dto.isapplicable;   //update generator flag
            fuel.UpdatedBy = GetCurrentUserId();                  // TODO: logged user id
            fuel.UpdateDate = DateTime.Now;

            await _commonService.UpdateAsync(fuel);

            return true; throw new NotImplementedException();
        }
    }
}
