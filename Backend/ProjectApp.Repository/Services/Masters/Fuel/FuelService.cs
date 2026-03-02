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
        public async Task<FuelResponseDTO> CreateAsync(FuelCreateUpdateDTO dto)
        {
            var parameters = new[]
            {
        new SqlParameter("@FuelName", dto.fuel_name),
        new SqlParameter("@FuelDesc", (object?)dto.fuel_Desc ?? DBNull.Value),
        new SqlParameter("@IsApplicable", dto.isapplicable),
        new SqlParameter("@EntryBy", GetCurrentUserId())
    };

            var insertedId = _context.Database
                .SqlQueryRaw<int>(
                    "EXEC USP_CB_FuelInsert @FuelName,@FuelDesc,@IsApplicable,@EntryBy",
                    parameters)
                .AsEnumerable()
                .FirstOrDefault();

            return new FuelResponseDTO
            {
                fuel_id = _idEncoder.Encode(insertedId),
                fuel_name = dto.fuel_name,
                fuel_Desc = dto.fuel_Desc,
                isapplicable = dto.isapplicable,
                IsActive = true
            };
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
                fuel_Desc = x.fuel_Desc,
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
                new SqlParameter("@FuelDesc", (object?)dto.fuel_Desc ?? DBNull.Value),
                new SqlParameter("@IsApplicable", dto.isapplicable),
                new SqlParameter("@UpdatedBy", GetCurrentUserId())
            };

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_FuelUpdate @FuelId,@FuelName,@FuelDesc,@IsApplicable,@UpdatedBy",
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
            fuel.UpdatedBy = GetCurrentUserId();
            fuel.UpdateDate = DateTime.Now;

            await _commonService.UpdateAsync(fuel);

            return true;
        }

        public async Task<FuelResponseDTO> GetByIdAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            var data = await _context.CB_MasterFuelTypes
                .FromSqlRaw("EXEC USP_CB_FuelGetById @FuelId",
                    new SqlParameter("@FuelId", id))
                .AsNoTracking()
                .ToListAsync();

            var fuel = data.FirstOrDefault();
            if (fuel == null) return null;

            return new FuelResponseDTO
            {
                fuel_id = encryptedId,
                fuel_name = fuel.fuel_name,
                fuel_Desc = fuel.fuel_Desc,
                IsActive = fuel.IsActive,
                isapplicable = fuel.isapplicable
            };
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

        public async Task<PagedFuelResponseDTO> SearchAsync(FuelTypeSearchDTO dto)
        {
            int? decodedId = null;
            if (!string.IsNullOrWhiteSpace(dto.fuel_id))
            {
                var temp = _idEncoder.Decode(dto.fuel_id);
                if (temp > 0)
                    decodedId = temp;
            }

            using var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "USP_CB_FuelTypeSearch";
            command.CommandType = System.Data.CommandType.StoredProcedure;

            command.Parameters.AddRange(new[]
            {
                new SqlParameter("@fuel_id", (object?)decodedId ?? DBNull.Value),
                new SqlParameter("@fuel_name", (object?)dto.fuel_name ?? DBNull.Value),
                new SqlParameter("@fuel_desc", (object?)dto.fuel_Desc ?? DBNull.Value),
                new SqlParameter("@IsActive", (object?)dto.IsActive ?? DBNull.Value),
                new SqlParameter("@IsApplicable", (object?)dto.IsApplicable ?? DBNull.Value),
                new SqlParameter("@PageNumber", dto.PageNumber),
                new SqlParameter("@PageSize", dto.PageSize),
                new SqlParameter("@SortColumn", dto.SortColumn),
                new SqlParameter("@SortDirection", dto.SortDirection)
            });

            var list = new List<FuelResponseDTO>();
            int totalRecords = 0, totalPages = 0, currentPage = 0;

            using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                list.Add(new FuelResponseDTO
                {
                    fuel_id = _idEncoder.Encode(Convert.ToInt32(reader["fuel_id"])),
                    fuel_name = reader["fuel_name"].ToString(),
                    fuel_Desc = reader["fuel_Desc"].ToString(),
                    IsActive = Convert.ToBoolean(reader["IsActive"]),
                    isapplicable = Convert.ToBoolean(reader["isapplicable"])
                });
            }

            if (await reader.NextResultAsync())
            {
                if (await reader.ReadAsync())
                {
                    totalRecords = Convert.ToInt32(reader["TotalRecords"]);
                    totalPages = Convert.ToInt32(reader["TotalPages"]);
                    currentPage = Convert.ToInt32(reader["CurrentPage"]);
                }
            }

            return new PagedFuelResponseDTO
            {
                Data = list,
                TotalRecords = totalRecords,
                TotalPages = totalPages,
                CurrentPage = currentPage
            };
        }
    }
}
