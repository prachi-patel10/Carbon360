using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Masters.City;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.City;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Utilities.Auth;
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
                    "EXEC USP_CB_CityMasterInsert @CityName={0}, @StateName={1}, @Pincode={2}, @EntryBy={3}",
                    dto.CityName, dto.StateName, dto.Pincode, userId)
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


    }
}
