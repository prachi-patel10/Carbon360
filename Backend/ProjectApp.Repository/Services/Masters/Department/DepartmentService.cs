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
using ProjectApp.Repository.Utilities.Auth;
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
        private readonly IdEncoder _idEncoder;



        public DepartmentService(IMapper mapper, ICommonService<CB_Department> common,CBContext context, IUserContext userContext, IdEncoder idEncoder) : base(common, mapper, userContext)
        {
            _mapper = mapper;
            _deptService = common;
            _context = context;
            _idEncoder = idEncoder;
        }

        public async Task<int> CreateDepartmentAsync(DepartmentDTO dto)
        {
            int userId = GetCurrentUserId();

            var result = await _context.Database
                .SqlQueryRaw<int>(
                    "EXEC USP_CB_DepartmentInsert @DepartmentName={0}, @UserId={1}",
                    dto.DepartmentName, userId)
                  .ToListAsync();

            return result.FirstOrDefault();
        }

        public async Task<bool> DeleteDepartmentAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);
            int userId = GetCurrentUserId();

            var rows = await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_DepartmentDelete @DepartmentId={0}, @UserId={1}",
                id, userId);

            return rows > 0;
        }


        public async Task<List<DepartmentDTO>> GetAllDepartmentsAsync()
        {
            var departments = await _context.CB_Departments
            .FromSqlRaw("EXEC USP_CB_DepartmentGetAll")
            .AsNoTracking()
            .ToListAsync();

            var dtos = _mapper.Map<List<DepartmentDTO>>(departments);

            foreach (var dto in dtos)
            {
                dto.Id = _idEncoder.Encode(_idEncoder.Decode(dto.Id));
            }

            return dtos;

        }

        public async Task<DepartmentDTO> GetDepartmentByIdAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            var departments = await _context.CB_Departments
                .FromSqlRaw("EXEC USP_CB_DepartmentGetById @DepartmentId={0}", id)
                .AsNoTracking()
                .ToListAsync();

            var department = departments.FirstOrDefault();

            if (department == null)
                return null;

            var dto = _mapper.Map<DepartmentDTO>(department);

            // Encrypt ID before returning
            dto.Id = _idEncoder.Encode(department.DepartmentId);

            return dto;
        }


        public async Task<bool> UpdateDepartmentAsync(DepartmentDTO dto)
        {
            int userId = GetCurrentUserId();

            var rows = await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_DepartmentUpdate @DepartmentId={0}, @DepartmentName={1}, @UserId={2}",
                dto.Id, dto.DepartmentName, userId);

            return rows > 0;
        }
    }
}
