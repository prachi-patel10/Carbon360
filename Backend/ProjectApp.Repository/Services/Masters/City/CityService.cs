using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Masters.City;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.City;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Utilities.Auth;
using ProjectApp.Repository.Utilities.SP;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.Masters.City
{
    public class CityService : BaseService<CB_MasterCity>, ICityService
    {
        private readonly CBContext _context;
        private readonly IdEncoder _idEncoder;

        public CityService(
            IMapper mapper,
            ICommonService<CB_MasterCity> common,
            CBContext context,
            IUserContext userContext,
            IdEncoder idEncoder
        ) : base(common, mapper, userContext)
        {
            _context = context;
            _idEncoder = idEncoder;
        }

        // ================= CREATE =================

        public async Task<CityResponseDTO> CreateCityAsync(CityCreateDTO dto)
        {
            int userId = GetCurrentUserId();

            var result = await _context.Database
                .SqlQueryRaw<int>(
                    "EXEC USP_CB_CityMasterInsert @CityName={0}, @StateName={1}, @EntryBy={2}",
                    dto.CityName, dto.StateName, userId)
                .ToListAsync();

            int newId = result.FirstOrDefault();

            var city = await _context.CB_MasterCities
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.CityId == newId);

            if (city == null)
                return null;

            var response = _mapper.Map<CityResponseDTO>(city);
            response.CityId = _idEncoder.Encode(city.CityId);

            return response;
        }

        // ================= GET ALL =================

        public async Task<List<CityResponseDTO>> GetAllCitiesAsync()
        {
            var cities = await _context.CB_MasterCities
                .FromSqlRaw("EXEC USP_CB_CityMasterGetAllList")
                .AsNoTracking()
                .ToListAsync();

            var response = _mapper.Map<List<CityResponseDTO>>(cities);

            for (int i = 0; i < cities.Count; i++)
            {
                response[i].CityId = _idEncoder.Encode(cities[i].CityId);
            }

            return response;
        }

        public async Task<bool> UpdateCityAsync(CityUpdateDTO dto)
        {
            if (dto == null)
                return false;

            int id = _idEncoder.Decode(dto.CityId);
            int userId = GetCurrentUserId();

            var rowsAffected = await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_CityMasterUpdate @CityId={0}, @CityName={1}, @StateName={2}, @Pincode={3}, @UpdatedBy={4}",
                id,
                dto.CityName,
                dto.StateName,
                dto.Pincode,
                userId);

            return rowsAffected > 0;
        }

        public async Task<PageResult> SearchCitiesAsync(SearchRequest request)
        {
            var parameters = SpParameterBuilder.BuildSearchParams(request);

            var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "USP_CB_CityMasterSearch";
            command.CommandType = System.Data.CommandType.StoredProcedure;

            foreach (var param in parameters)
                command.Parameters.Add(param);

            using var reader = await command.ExecuteReaderAsync();

            int totalRecords = 0;

            if (await reader.ReadAsync())
                totalRecords = reader.GetInt32(0);

            await reader.NextResultAsync();

            var cities = new List<CB_MasterCity>();

            while (await reader.ReadAsync())
            {
                cities.Add(new CB_MasterCity
                {
                    CityId = reader.GetInt32(reader.GetOrdinal("CityId")),
                    CityName = reader["CityName"].ToString(),
                    StateName = reader["StateName"].ToString(),
                    //Pincode = reader["Pincode"].ToString(),
                    IsActive = (bool)reader["IsActive"],
                    EntryDate = (DateTime)reader["EntryDate"],
                    UpdateDate = reader["UpdateDate"] as DateTime?
                });
            }

            await connection.CloseAsync();

            var dtoList = _mapper.Map<List<CityResponseDTO>>(cities);

            for (int i = 0; i < cities.Count; i++)
                dtoList[i].CityId = _idEncoder.Encode(cities[i].CityId);

            return new PageResult
            {
                Data = dtoList,
                TotalRecords = totalRecords,
                CurrentPage = request.PageNumber,
                TotalPages = (int)Math.Ceiling((double)totalRecords / request.PageSize)
            };
        }

        public async Task<bool> ToggleStatusAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);
            int userId = GetCurrentUserId();

            var city = await _context.CB_MasterCities
                .FirstOrDefaultAsync(x =>
                    x.CityId == id &&
                    x.IsDeleted == false);

            if (city == null)
                return false;

            city.IsActive = !city.IsActive;
            city.UpdatedBy = userId;
            city.UpdateDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }

        // ================= SOFT DELETE =================

        public async Task<bool> DeleteCityAsync(string encryptedId)
        {
            if (string.IsNullOrEmpty(encryptedId))
                return false;

            int id = _idEncoder.Decode(encryptedId);
            int userId = GetCurrentUserId();

            var rowsAffected = await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_CityMasterDelete @CityId={0}, @UpdatedBy={1}",
                id,
                userId
            );

            return rowsAffected > 0;
        }


    }
}
