using AutoMapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Account.User;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.User;

namespace ProjectApp.Repository.Services.User
{
    public class UserService : IUserService
    {
        private readonly CBContext _context;
        private readonly IMapper _mapper;
        private readonly ICommonService<CB_User> _userRepository;

        public UserService(ICommonService<CB_User> userRepository, IMapper mapper, CBContext context)
        {
            _userRepository = userRepository;
            _mapper = mapper;
            _context = context;
        }

        // ================= CREATE =================
        public async Task<UserResDTO> CreateUserAsync(UserDTO dto, int? loggedInUserId)
        {
            if (dto.Password != dto.ConfirmPassword)
                throw new Exception("Password mismatch");

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_UserInsertWithRoles @FullName, @Email, @Password, @DepartmentId, @RoleIds, @EntryBy",
                new SqlParameter("@FullName", dto.FullName),
                new SqlParameter("@Email", dto.Email),
                new SqlParameter("@Password", hashedPassword),
                new SqlParameter("@DepartmentId", dto.DepartmentId ?? (object)DBNull.Value),
                new SqlParameter("@RoleIds", dto.RoleId.ToString()),
                new SqlParameter("@EntryBy", loggedInUserId ?? (object)DBNull.Value)
            );

            return new UserResDTO
            {
                FullName = dto.FullName,
                Email = dto.Email
            };
        }


        // ================= GET ALL =================
        public async Task<List<UserResDTO>> GetUsersAsync()
        {
            var users = _context.CB_Users
    .FromSqlRaw("EXEC USP_CB_UserGetAll")
    .AsEnumerable()
    .ToList();


            return _mapper.Map<List<UserResDTO>>(users);
        }

        // ================= GET BY ID =================
        public async Task<UserResDTO> GetUserByIdAsync(int id)
        {
            var user = await _context.CB_Users
                .FromSqlRaw("EXEC USP_CB_UserGetById @UserId",
                    new SqlParameter("@UserId", id))
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (user == null)
                throw new Exception("User not found");

            return _mapper.Map<UserResDTO>(user);
        }

        // ================= GET BY USERNAME =================
        public async Task<UserResDTO> GetUserByUsernameAsync(string name)
        {
            var user = await _context.CB_Users
                .FromSqlRaw("EXEC USP_CB_UserGetByUsername @FullName",
                    new SqlParameter("@FullName", name))
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (user == null)
                throw new Exception("User not found");

            return _mapper.Map<UserResDTO>(user);
        }

        // ================= UPDATE =================
        public async Task<bool> UpdateUserAsync(UserUpdateDTO dto)
        {
            var password = string.IsNullOrEmpty(dto.Password)
                ? null
                : BCrypt.Net.BCrypt.HashPassword(dto.Password);

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_UserUpdate @UserId, @FullName, @Email, @Password, @DepartmentId, @IsActive",
                new SqlParameter("@UserId", dto.UserId),
                new SqlParameter("@FullName", dto.FullName),
                new SqlParameter("@Email", dto.Email),
                new SqlParameter("@Password", (object?)password ?? DBNull.Value),
                new SqlParameter("@DepartmentId", dto.DepartmentId),
                new SqlParameter("@IsActive", dto.IsActive)
            );

            return true;
        }

        // ================= DELETE =================
        public async Task<bool> DeleteUserAsync(int id)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_UserDelete @UserId",
                new SqlParameter("@UserId", id)
            );

            return true;
        }
    }
}
