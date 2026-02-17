using AutoMapper;
using ProjectApp.Core.DTOs.Account.User;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.User;

namespace ProjectApp.Repository.Services.User
{
    public class UserService : IUserService
    {
        private readonly IMapper _mapper;
        private readonly ICommonService<CB_User> _userRepository;

        public UserService(ICommonService<CB_User> userRepository, IMapper mapper)
        {
            _userRepository = userRepository;
            _mapper = mapper;
        }

        // CREATE
        public async Task<UserResDTO> CreateUserAsync(UserDTO dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            var existingUser = await _userRepository
                .GetAllByFilterAsync(u => u.FullName == dto.UserName && !u.IsDeleted);

            if (existingUser != null)
                throw new Exception("Username already exists");

            var user = _mapper.Map<CB_User>(dto);

            user.Password = HashPassword(dto.Password);
            user.EntryDate = DateTime.Now;
            user.UpdateDate = DateTime.Now;
            user.IsDeleted = false;

            var userCreated = await _userRepository.CreateAsync(user);

            return _mapper.Map<UserResDTO>(userCreated);
        }

        // DELETE (Soft Delete)
        public async Task<bool> DeleteUserAsync(int id)
        {
            if (id <= 0)
                throw new Exception("Invalid user id");

            var user = await _userRepository
                .GetAllByFilterAsync(u => u.UserId == id, true);

            if (user == null)
                throw new Exception("User not found");

            user.IsDeleted = true;
            user.UpdateDate = DateTime.Now;

            await _userRepository.UpdateAsync(user);

            return true;
        }

        // GET BY ID
        public async Task<UserResDTO> GetUserByIdAsync(int id)
        {
            var user = await _userRepository
                .GetAllByFilterAsync(u => u.UserId == id && !u.IsDeleted, true);

            if (user == null)
                throw new Exception("User not found");

            return _mapper.Map<UserResDTO>(user);
        }

        // GET BY USERNAME
        public async Task<UserResDTO> GetUserByUsernameAsync(string name)
        {
            var user = await _userRepository
                .GetAllByFilterAsync(u => u.FullName == name && !u.IsDeleted);

            if (user == null)
                throw new Exception("User not found");

            return _mapper.Map<UserResDTO>(user);
        }

        // GET ALL
        public async Task<List<UserResDTO>> GetUsersAsync()
        {
            var users = await _userRepository
                .GetAllData(u => !u.IsDeleted, true);

            return _mapper.Map<List<UserResDTO>>(users);
        }

        // UPDATE
        public async Task<bool> UpdateUserAsync(UserDTO dto)
        {
            if (dto == null)
                throw new Exception("Invalid data");

            var user = await _userRepository
                .GetAllByFilterAsync(u => u.UserId == dto.Id && !u.IsDeleted, true);

            if (user == null)
                throw new Exception("User not found");

            user.FullName = dto.UserName;
            user.Email = dto.Email;
            user.IsActive = dto.IsActive;
            user.UpdateDate = DateTime.Now;

            if (!string.IsNullOrEmpty(dto.Password))
                user.Password = HashPassword(dto.Password);

            await _userRepository.UpdateAsync(user);

            return true;
        }

        private string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }
    }
}
