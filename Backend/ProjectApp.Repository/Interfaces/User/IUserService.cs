using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ProjectApp.Core.DTOs.Account.User;
using ProjectApp.Repository.Utilities.SP;

namespace ProjectApp.Repository.Interfaces.User
{
    public interface IUserService
    {
        Task<UserResDTO> CreateUserAsync(UserDTO dto, int? loggedInUserId);
        Task<bool> DeleteUserAsync(string id);
        Task<List<UserResDTO>> GetUsersAsync(); // get all users
        Task<List<UserResDTO>> SearchUsersAsync(string search); // search users
        Task<UserResDTO> GetUserByIdAsync(string id); // get by id
        Task<UserResDTO> GetUserByUsernameAsync(string username); // get by username
        Task<bool> UpdateUserAsync(UserUpdateDTO dto);
        Task<bool> UpdateUserStatusAsync(UserStatusUpdateDTO dto);

        Task<(List<UserResDTO> Users, int TotalRecords)> SearchUsersPaginatedAsync(SearchRequest request);
    }
}
