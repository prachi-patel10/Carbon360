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

        Task<GeneratorOperationResponseDTO> UpdateAsync(string encryptedId, GenerationOperationUpdateDTO dto);

        Task<List<GeneratorResponseDTO>> GetBySiteIdAsync(int siteId);
        Task<bool> UpdateStatusAsync(string encryptedId, int statusId);

        Task<Dictionary<string, object>> GetByHashIdAsyncPDF(string hashId);

        Task<byte[]> GenerateGeneratorOperationPdf(string operationId);

        Task<GeneratorOperationPagedResponseDTO> SearchAsync(
    string search,
    string fuelTypes,        
    string generatorName,
    DateTime? startDate,
    DateTime? endDate,
    DateTime? entryStartDate,   
    DateTime? entryEndDate,
    int? statusId,
    int pageNumber,
    int pageSize);
        Task<List<WorkflowActionDTO>> GetWorkflowActionsAsync(string encryptedId);

        Task<GeneratorOperationPagedResponseDTO> GetMyActionRecordsAsync(
      int pageNumber, int pageSize, string sortColumn, string sortDirection);

    }
}

