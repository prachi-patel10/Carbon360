using ProjectApp.Core.DTOs.Account.GeneratorOperation;
using ProjectApp.Core.DTOs.Common;
using ProjectApp.Core.DTOs.Masters.Generator;
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

        Task<List<GeneratorResponseDTO>> GetBySiteIdAsync(int siteId);
        Task<bool> UpdateStatusAsync(string encryptedId, int statusId);

        Task<GeneratorOperationPagedResponseDTO> SearchAsync(
    string search = null,
    string fuelType = null,
    string generatorName = null,
    DateTime? startDate = null,
    DateTime? endDate = null,
    int? statusId = null,
    int pageNumber = 1,
    int pageSize = 10
);
        Task<List<WorkflowActionDTO>> GetWorkflowActionsAsync(string encryptedId);
    }

}
