using ProjectApp.Core.DTOs.Account.VehicleTripEmission;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.VehicleTripEmission
{
    public interface IVehicleTripEmissionService
    {
        Task<ResponseVehicleTripEmissionDTO> CreateAsync(CreateVehicleTripEmissionDTO dto);
        Task<List<ResponseVehicleTripEmissionDTO>> GetAllAsync();
        Task<ResponseVehicleTripEmissionDTO> GetByHashIdAsync(string hashId);
        Task<bool> DeleteAsync(string hashId);
        Task<ResponseVehicleTripEmissionDTO> UpdateAsync(UpdateVehicleTripEmissionDTO dto);

        Task<bool> UpdateStatusAsync(VehicleTripStatusUpdateDTO dto);

    }
}
