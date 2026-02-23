using ProjectApp.Core.DTOs.Masters.Fuel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.Masters.Fuel
{
    public interface IFuelService
    {
        Task<IEnumerable<FuelResponseDTO>> GetAllAsync();
        Task<FuelResponseDTO> GetByIdAsync(int id);
        Task<FuelResponseDTO> CreateAsync(FuelResponseDTO dto);
        Task<bool> UpdateAsync(FuelResponseDTO dto);
        Task<bool> DeleteAsync(int id);
    }
}
