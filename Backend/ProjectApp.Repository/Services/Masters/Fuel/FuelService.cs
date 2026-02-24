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
        private readonly IdEncoder _idEncoder;
        private readonly CBContext _context;
        private readonly IUserContext _userContext;
        public FuelService(
            CBContext context,
            IUserContext userContext,
            IdEncoder idEncoder)
        {
            _context = context;
            _userContext = userContext;
            _idEncoder = idEncoder;
        }

        private int GetCurrentUserId()
        {
            return _userContext.UserId;
        }
        public async Task<FuelResponseDTO> CreateAsync(FuelResponseDTO dto)
        {
            var insertedId = _context.Database
            .SqlQueryRaw<int>(
                "EXEC USP_CB_FuelInsert @FuelName, @CO2Factor, @NOxFactor, @CH4Factor, @EntryBy",
                new SqlParameter("@FuelName", dto.fuel_name),
                new SqlParameter("@CO2Factor", dto.co2_factor),
                new SqlParameter("@NOxFactor", dto.nox_factor),
                new SqlParameter("@CH4Factor", dto.ch4_factor),
                new SqlParameter("@EntryBy", GetCurrentUserId())
            )
            .AsEnumerable()
            .First();

            return new FuelResponseDTO
            {
                fuel_id = _idEncoder.Encode(insertedId),
                fuel_name = dto.fuel_name,
                co2_factor = dto.co2_factor,
                nox_factor = dto.nox_factor,
                ch4_factor = dto.ch4_factor,
                IsActive = true
            };
        }


        public async Task<IEnumerable<FuelResponseDTO>> GetAllAsync()
        {
            var result = new List<FuelResponseDTO>();

            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "USP_CB_FuelGetAll";
            command.CommandType = System.Data.CommandType.StoredProcedure;

            using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                result.Add(new FuelResponseDTO
                {
                    fuel_id = _idEncoder.Encode(Convert.ToInt32(reader["fuel_id"])),
                    fuel_name = reader["fuel_name"].ToString(),
                    co2_factor = Convert.ToDecimal(reader["co2_factor"]),
                    nox_factor = Convert.ToDecimal(reader["nox_factor"]),
                    ch4_factor = Convert.ToDecimal(reader["ch4_factor"]),
                    IsActive = Convert.ToBoolean(reader["IsActive"])
                });
            }

            return result;

        }

        public async Task<bool> UpdateAsync(FuelResponseDTO dto)
        {
            int id = _idEncoder.Decode(dto.fuel_id);

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_FuelUpdate @FuelId, @FuelName, @CO2Factor, @NOxFactor, @CH4Factor, @UpdatedBy",
                new SqlParameter("@FuelId", id),
                new SqlParameter("@FuelName", dto.fuel_name),
                new SqlParameter("@CO2Factor", dto.co2_factor),
                new SqlParameter("@NOxFactor", dto.nox_factor),
                new SqlParameter("@CH4Factor", dto.ch4_factor),
                new SqlParameter("@UpdatedBy", GetCurrentUserId())
            );

            return true;
        }

        public async Task<bool> UpdateStatusAsync(FuelStatusUpdateDTO dto)
        {
            int id = _idEncoder.Decode(dto.fuel_id);

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE CB_Master_Fuel SET IsActive=@IsActive, UpdatedBy=@UpdatedBy, UpdateDate=GETDATE() WHERE fuel_id=@FuelId",
                new SqlParameter("@IsActive", dto.IsActive),
                new SqlParameter("@FuelId", id),
                new SqlParameter("@UpdatedBy", GetCurrentUserId())
            );

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

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_FuelDelete @FuelId, @UpdatedBy",
                new SqlParameter("@FuelId", id),
                new SqlParameter("@UpdatedBy", GetCurrentUserId())
            );

            return true;
        }
    }
}
