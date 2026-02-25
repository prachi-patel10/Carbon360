using ProjectApp.Core.DTOs.Masters.EmissionFactor;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.Masters.EmissionFactor
{
    public interface IEmissionFactorService
    {
        Task<ApiResponse<List<EmissionFactorResponseDTO>>> GetAllAsync();
        Task<ApiResponse<EmissionFactorResponseDTO>> GetByIdAsync(string encryptedId);
        Task<ApiResponse<string>> CreateAsync(EmissionFactorRequestDTO dto, int userId);
        Task<ApiResponse<string>> UpdateAsync(string encryptedId, EmissionFactorRequestDTO dto, int userId);
        Task<ApiResponse<string>> DeleteAsync(string encryptedId, int userId);
        Task<ApiResponse<string>> UpdateStatusAsync(string encryptedId, bool isActive, int userId);
    }
}
