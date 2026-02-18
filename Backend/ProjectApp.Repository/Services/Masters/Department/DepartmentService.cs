using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Masters.Department;
using ProjectApp.Core.Entities;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.Department;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Services.User;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.Masters.Department
{
    public class DepartmentService : BaseService<CB_Department>,IDepartmentService
    {
        private readonly IMapper _mapper;
        private readonly ICommonService<CB_Department> _deptService;
        private readonly CBContext _context;

        public DepartmentService(IMapper mapper, ICommonService<CB_Department> common,CBContext context, IUserContext userContext) : base(common, mapper, userContext)
        {
            _mapper = mapper;
            _deptService = common;
            _context = context;
        }

        public async Task<int> CreateDepartmentAsync(DepartmentDTO dto)
        {
            int userId = GetCurrentUserId();

            var result = await _context.Database
                .SqlQueryRaw<int>(
                    "EXEC SP_Department_Insert @DepartmentName={0}, @UserId={1}",
                    dto.DepartmentName, userId)
                .FirstAsync();

            return result;
        }

        public async Task<bool> DeleteDepartmentAsync(int id)
        {
            int userId = GetCurrentUserId();

            var rows = await _context.Database.ExecuteSqlRawAsync(
                "EXEC SP_Department_Delete @DepartmentId={0}, @UserId={1}",
                id, userId);

            return rows > 0;
        }

        public async Task<List<DepartmentDTO>> GetAllDepartmentsAsync()
        {
            var departments = await _context.CB_Departments
            .FromSqlRaw("EXEC USP_CB_DepartmentGetAll")
            .AsNoTracking()
            .ToListAsync();

            return _mapper.Map<List<DepartmentDTO>>(departments);
        }

        public async Task<DepartmentDTO> GetDepartmentByIdAsync(int id)
        {
            var department = await _context.CB_Departments
            .FromSqlRaw("EXEC USP_CB_DepartmentGetById @DepartmentId={0}", id)
            .AsNoTracking()
            .FirstOrDefaultAsync();

            return _mapper.Map<DepartmentDTO>(department);
        }

        public async Task<bool> UpdateDepartmentAsync(DepartmentDTO dto)
        {
            int userId = GetCurrentUserId();

            var rows = await _context.Database.ExecuteSqlRawAsync(
                "EXEC SP_Department_Update @DepartmentId={0}, @DepartmentName={1}, @UserId={2}",
                dto.Id, dto.DepartmentName, userId);

            return rows > 0;
        }
    }
}
