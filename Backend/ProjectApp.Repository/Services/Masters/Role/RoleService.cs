using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AutoMapper;
using ProjectApp.Core.DTOs.Account.Role;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.Role;

namespace ProjectApp.Repository.Services.Masters.Role
{
    public class RoleService : IRoleService
    {
        private readonly IMapper _mapper;
        private readonly ICommonService<Roles> _roleService;

        public RoleService(IMapper mapper, ICommonService<Roles> common)
        {
            _mapper = mapper;
            _roleService = common;
        }

        public async Task<List<RoleDTO>> GetAllRolesAsync()
        {
            var role = await _roleService.GetAllAsync();
            return _mapper.Map<List<RoleDTO>>(role);
        }
    }
}
