using ProjectApp.Core.DTOs.Account.GeneratorOperation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.GenerationOperation
{
    public interface IGeneratorOperationService
    {
        //Task<GeneratorOperationResponseDTO> CreateAsync(GeneratorOperationCreateDTO dto);
        Task<List<GeneratorOperationResponseDTO>> GetAllAsync();
        //Task<GeneratorOperationResponseDTO> GetByIdAsync(int id);
        //Task<bool> DeleteAsync(int id);
        Task<GeneratorOperationResponseDTO> CreateAsync(GeneratorOperationCreateDTO dto);

        Task<GeneratorOperationResponseDTO> GetByIdAsync(string encryptedId);

        Task<bool> DeleteAsync(string encryptedId);

        Task<GeneratorOperationResponseDTO> UpdateAsync(string encryptedId, GeneratorOperationCreateDTO dto);

    }
}
