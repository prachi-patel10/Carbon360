using ProjectApp.Core.DTOs.Masters.PlantationProject;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.Masters.PlantationProject
{
    public interface IPlantationProject
    {
        Task<string> InsertAsync(PlantationProjectInsertDTO dto, int userId);
        Task<bool> UpdateAsync(PlantationProjectUpdateDTO dto, int userId);
        Task<bool> DeleteAsync(string projectId, int userId);

        Task<PlantationProjectDTO> GetByIdAsync(string projectId);
        Task<List<PlantationProjectDTO>> GetAllAsync();

        Task<(int TotalCount, List<PlantationProjectDTO> Data)> SearchAsync(PlantationProjectSearchDTO dto);
    }
}
