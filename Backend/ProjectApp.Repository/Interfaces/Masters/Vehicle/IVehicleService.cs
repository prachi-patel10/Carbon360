using ProjectApp.Core.DTOs.Masters.Vehicle;
using ProjectApp.Repository.Utilities.SP;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.Masters.Vehicle
{
    public interface IVehicleService
    {
        Task<VehicleResponseDto?> InsertAsync(VehicleDto dto);
        Task UpdateAsync(VehicleUpdateDto dto);
        Task DeleteAsync(string encryptedId, int userId);
        Task<VehicleResponseDto?> GetById(string encryptedId);
        Task<List<VehicleResponseDto>> GetAllList();
        Task<VehicleResponseDto?> GetByName(string name);
        Task<PageResult> SearchAsync(VehicleSearchRequest request);
        Task UpdateStatusAsync(string encryptedId, bool isActive, int userId);
    }
}
