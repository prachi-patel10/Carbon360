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

        Task<List<UserDTO>> GetUsersAsync();
        Task<UserResDTO> GetUserByIdAsync(int id);
        Task<UserDTO> GetUserByUsernameAsync(string name);
        Task<bool> UpdateUserAsync(UserDTO dto);
        Task<bool> DeleteUserAsync(int id);
    }
}
