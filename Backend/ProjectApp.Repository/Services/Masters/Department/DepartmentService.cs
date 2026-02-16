using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AutoMapper;
using ProjectApp.Core.DTOs.Masters.Department;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.Department;

namespace ProjectApp.Repository.Services.Masters.Department
{
    public class DepartmentService : IDepartmentService
    {
        private readonly IMapper _mapper;
        private readonly ICommonService<Departments> _deptService;

        public DepartmentService(IMapper mapper, ICommonService<Departments> common)
        {
            _mapper = mapper;
            _deptService = common;
        }
        public async Task<List<DepartmentDTO>> GetAllDepartmentsAsync()
        {
            var dept = await _deptService.GetAllAsync();
            return _mapper.Map<List<DepartmentDTO>>(dept);
        }
    }
}
