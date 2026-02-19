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
        Task<UserResDTO> CreateUserAsync(UserDTO dto, int? loggedInUserId);
        Task<bool> DeleteUserAsync(string id);
        Task<UserResDTO> GetUserByIdAsync(string id);
        Task<UserResDTO> GetUserByUsernameAsync(string name);
        Task<List<UserResDTO>> GetUsersAsync();
        Task<bool> UpdateUserAsync(UserUpdateDTO dto);
    }
}
