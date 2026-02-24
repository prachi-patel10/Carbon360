using AutoMapper;
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
    public class FuelService : BaseService<CB_Master_Fuel>, IFuelService
    {
        private readonly IdEncoder _idEncoder;
        public FuelService(
           ICommonService<CB_Master_Fuel> commonService,
           IMapper mapper,
           IUserContext userContext,
           IdEncoder idEncoder
       ) : base(commonService, mapper, userContext)
        {
            _idEncoder = idEncoder;
        }
        public async Task<FuelResponseDTO> CreateAsync(FuelResponseDTO dto)
        {
            var entity = _mapper.Map<CB_Master_Fuel>(dto);
            entity.EntryBy = GetCurrentUserId();
            entity.EntryDate = DateTime.Now;
            entity.IsDeleted = false;
            await _commonService.CreateAsync(entity);
            return _mapper.Map<FuelResponseDTO>(entity);
          }
          
        public async Task<bool> DeleteAsync(int id)
        {
            var existing = await _commonService.GetAllByFilterAsync(x => x.fuel_id == id);

            if (existing == null)
                throw new Exception("Fuel not found");

            existing.IsDeleted = true;
            existing.IsActive = false;
            existing.UpdatedBy = GetCurrentUserId();
            existing.UpdateDate = DateTime.Now;

            await _commonService.UpdateAsync(existing);

            return true;
        }

        public async Task<IEnumerable<FuelResponseDTO>> GetAllAsync()
        {
            var data = await _commonService.GetAllData(x => x.IsDeleted == false, true);

            return _mapper.Map<List<FuelResponseDTO>>(data);

        }

        public async Task<FuelResponseDTO> GetByIdAsync(int id)
        {
            var data = await _commonService.GetAllByFilterAsync(x => x.fuel_id == id && x.IsDeleted == false, true);

            if (data == null)
                return null;

            return _mapper.Map<FuelResponseDTO>(data);
        }

        public async Task<bool> UpdateAsync(FuelResponseDTO dto)
        {
            var existing = await _commonService.GetAllByFilterAsync(x => x.fuel_id == dto.fuel_id && x.IsDeleted == false);

            if (existing == null)
                throw new Exception("Fuel not found");

            existing.fuel_name = dto.fuel_name;
            existing.co2_factor = dto.co2_factor;
            existing.nox_factor = dto.nox_factor;
            existing.ch4_factor = dto.ch4_factor;
            existing.IsActive = dto.IsActive;
            existing.UpdatedBy = GetCurrentUserId();
            existing.UpdateDate = DateTime.Now;

            await _commonService.UpdateAsync(existing);

            return true;
        }

        public async Task<bool> UpdateStatusAsync(FuelStatusUpdateDTO dto)
        {
            var existing = await _commonService
                .GetAllByFilterAsync(x => x.fuel_id == dto.fuel_id && x.IsDeleted == false);

            if (existing == null)
                throw new Exception("Fuel not found");

            // Only update IsActive
            existing.IsActive = dto.IsActive;

            existing.UpdatedBy = GetCurrentUserId();
            existing.UpdateDate = DateTime.Now;

            await _commonService.UpdateAsync(existing);

            return true;
        }
    }
}
