using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ProjectApp.Core.DTOs.Masters.Department;

namespace ProjectApp.Repository.Interfaces.Masters.Department
{
    public interface IDepartmentService
    {
        Task<List<DepartmentDTO>> GetAllDepartmentsAsync();
        Task<DepartmentDTO> GetDepartmentByIdAsync(int id);
        Task<int> CreateDepartmentAsync(DepartmentDTO dto);
        Task<bool> UpdateDepartmentAsync(DepartmentDTO dto);
        Task<bool> DeleteDepartmentAsync(int id);
    }
}
