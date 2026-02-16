using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ProjectApp.Core.DTOs.Account.Role;

namespace ProjectApp.Repository.Interfaces.Masters.Role
{
    public interface IRoleService
    {
        Task<List<RoleDTO>> GetAllRolesAsync();
    }
}
