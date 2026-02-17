using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ProjectApp.Core.DTOs.Account.User;

namespace ProjectApp.Repository.Interfaces.User
{
    public interface IUserService
    {
        Task<UserResDTO> CreateUserAsync(UserDTO dto);
        Task<bool> DeleteUserAsync(int id);
        Task<UserResDTO> GetUserByIdAsync(int id);
        Task<UserResDTO> GetUserByUsernameAsync(string name);
        Task<List<UserResDTO>> GetUsersAsync();
        Task<bool> UpdateUserAsync(UserDTO dto);
    }
}
