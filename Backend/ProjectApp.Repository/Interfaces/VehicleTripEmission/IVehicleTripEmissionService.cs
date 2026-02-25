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
        Task<VehicleTripEmissionDTO> CreateAsync(VehicleTripEmissionDTO dto);
        Task<List<VehicleTripEmissionDTO>> GetAllAsync();
        Task<VehicleTripEmissionDTO> GetByHashIdAsync(string hashId);
        Task<bool> DeleteAsync(string hashId);
        //Task<VehicleTripEmissionDTO> UpdateAsync(VehicleTripEmissionDTO dto);
       
    }
}
