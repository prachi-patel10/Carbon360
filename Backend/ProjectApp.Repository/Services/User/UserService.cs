using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AutoMapper;
using ProjectApp.Core.DTOs.Account.User;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.User;

namespace ProjectApp.Repository.Services.User
{
    public class UserService : IUserService
    {
        private readonly IMapper _mapper;
        private readonly ICommonService<Users> _userRepositoy;
        public UserService(ICommonService<Users> userRepository, IMapper mapper)
        {
            _userRepositoy = userRepository;
            _mapper = mapper;
        }

        public async Task<UserResDTO> CreateUserAsync(UserDTO dto)
        {
            if (dto == null)
            {
                throw new ArgumentNullException(nameof(dto));
            }

            var existingUser = await _userRepositoy.GetAllByFilterAsync(u => u.UserName == dto.UserName);
            if (existingUser != null)
            {
                throw new Exception("UserName Allready exists");
            }
            Users user = _mapper.Map<Users>(dto);
            user.Password = HashPassword(dto.Password);
            user.CreatedAt = DateTime.Now;
            user.UpdatedAt = DateTime.Now;
            user.IsDeleted = false;
            var userCreated = await _userRepositoy.CreateAsync(user);

            return _mapper.Map<UserResDTO>(userCreated);
            //throw new NotImplementedException();

        }

        public async Task<bool> DeleteUserAsync(int id)
        {
            if (id <= 0)
            {
                throw new Exception("Invalid user id");
            }
            var user = await _userRepositoy.GetAllByFilterAsync(user => user.Id == id, true);
            if (user == null)
            {
                throw new Exception(" user not found with id");
            }

            user.IsDeleted = true;
            await _userRepositoy.UpdateAsync(user);

            return true;
            //throw new NotImplementedException();
        }

        public async Task<UserResDTO> GetUserByIdAsync(int id)
        {
            var user = await _userRepositoy.GetAllByFilterAsync(user => user.Id == id, true);
            return _mapper.Map<UserResDTO>(user);
            //throw new NotImplementedException();
        }

        public async Task<UserDTO> GetUserByUsernameAsync(string name)
        {
            var user = await _userRepositoy.GetAllByFilterAsync(usser => usser.UserName == name);
            return _mapper.Map<UserDTO>(user);
            //throw new NotImplementedException();
        }

        public async Task<List<UserDTO>> GetUsersAsync()
        {
            var user = await _userRepositoy.GetAllData(user => !user.IsDeleted , true);
            return _mapper.Map<List<UserDTO>>(user);
            //throw new NotImplementedException();
        }

        public async Task<bool> UpdateUserAsync(UserDTO dto)
        {

            if (dto == null)
            {
                throw new Exception("user not found");
            }   
            var user = await _userRepositoy.GetAllByFilterAsync(u => u.Id == dto.Id, true);

            if (user == null)
            {
                throw new Exception("User not found");

            }

            var usertoupdate = _mapper.Map(dto, user);
            usertoupdate.UpdatedAt = DateTime.Now;


            //we will update only user info seperate method for password update
            if (!string.IsNullOrEmpty(dto.Password))
            {
                var passwordHash = HashPassword(dto.Password);
                user.Password = passwordHash;
                //user.PasswordSalt = passwordHash.Salt;
            }

            await _userRepositoy.UpdateAsync(user);

            return true;
            //throw new NotImplementedException();
        }

        private string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }
    }
}
