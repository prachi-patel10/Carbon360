using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ProjectApp.Core.DTOs.Masters.Department;
using ProjectApp.Repository.Utilities.SP;

namespace ProjectApp.Repository.Interfaces.Masters.Department
{
    public interface IDepartmentService
    {
            Task<DepartmentResponseDTO> CreateDepartmentAsync(DepartmentCreateDTO dto);

            Task<bool> UpdateDepartmentAsync(DepartmentUpdateDTO dto);

            Task<bool> DeleteDepartmentAsync(string encryptedId);

            Task<List<DepartmentResponseDTO>> GetAllDepartmentsAsync();

            Task<DepartmentResponseDTO> GetDepartmentByIdAsync(string encryptedId);

            Task<DepartmentResponseDTO> GetDepartmentByNameAsync(string name);

            Task<PageResult> SearchDepartmentsAsync(SearchRequest request);

            Task<bool> ToggleStatusAsync(string encryptedId);
        }
}
