using ProjectApp.Core.DTOs.Masters.Department;
using ProjectApp.Core.DTOs.Masters.Fuel;
using ProjectApp.Core.DTOs.Masters.VehicleType;
using ProjectApp.Repository.Utilities.SP;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.Masters.VehicleType
{
    public interface IVehicleTypeService
    {
        Task<VehicleTypeResponseDTO> CreateVehicleTypeAsync(VehicleTypeCreateDTO dto);

        Task<bool> UpdateVehicleTypeAsync(VehicleTypeUpdateDTO dto);

        Task<bool> DeleteVehicleTypeAsync(string encryptedId);

        Task<List<VehicleTypeResponseDTO>> GetAllVehicleTypesAsync();

        Task<VehicleTypeResponseDTO> GetVehicleTypeByIdAsync(string encryptedId);

        Task<bool> UpdateStatusAsync(VehicleTypeStatusUpdateDTO dto);

        Task<PageResult> SearchVehicleTypesAsync(VehicleTypeSearchDTO dto);
        Task<bool> ToggleStatusAsync(string encryptedId);
        //Task<VehicleTypeResponseDTO> GetVehicleTypeByNameAsync(string name);
    }
}
