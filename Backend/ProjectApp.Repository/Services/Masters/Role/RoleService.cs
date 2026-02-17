using AutoMapper;
using ProjectApp.Core.DTOs.Account.Role;
using ProjectApp.Core.Entities;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.Role;
using ProjectApp.Repository.Services.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.Masters.Role
{
    public class RoleService : IRoleService
    {
        private readonly IMapper _mapper;
        private readonly ICommonService<CB_Role> _roleService;
        private readonly ISPService _spService;
        public RoleService(IMapper mapper, ICommonService<CB_Role> common, ISPService sP)
        {
            _mapper = mapper;
            _roleService = common;
            _spService = sP;
        }


        //public async Task<List<RoleDTO>> GetAllRolesAsync()
        //{
        //    var role = await _roleService.GetAllAsync();
        //    return _mapper.Map<List<RoleDTO>>(role);
        //}

        public async Task<List<RoleDTO>> GetAllRolesAsync()
        {
            // ✅ Execute Stored Procedure
            var res = await _spService.ExecuteSpAsync("USP_CB_RoleGetAll");

            // ✅ Extract Data
            var data = (List<Dictionary<string, object>>)res["Data"];

            // ✅ Convert Result into RoleDTO List
            var roles = data.Select(row => new RoleDTO
            {
                Id = Convert.ToInt32(row["RoleId"]),
                RoleName = row["RoleName"]?.ToString(),

                // SP doesn't return these, so default
                RoleDescription = "",
                IsActive = true
            }).ToList();

            return roles;
        }
    }
}
