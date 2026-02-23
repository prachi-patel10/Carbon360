using ProjectApp.Core.DTOs.Masters.Department;
using ProjectApp.Core.DTOs.Masters.VehicleType;
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

        Task<VehicleTypeResponseDTO> GetVehicleTypeByNameAsync(string name);
    }
}
