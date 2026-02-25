using ProjectApp.Core.DTOs.Masters.Generator;
using ProjectApp.Repository.Utilities.SP;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.Masters.Generator
{
    public interface IGeneratorService
    {
        Task<GeneratorResponseDTO> GetById(string encryptedId);
        Task<List<GeneratorResponseDTO>> GetAll();
        Task<string> Create(GeneratorCreateUpdateDTO dto, int userId);
        Task Update(string encryptedId, GeneratorCreateUpdateDTO dto, int userId);
        Task Delete(string encryptedId);
        Task ToggleStatus(string encryptedId, bool isActive);
        Task<PageResult> SearchAsync(GeneratorSearchRequest request);
    }
}

