using AutoMapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Account.User;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Utilities.Auth;

namespace ProjectApp.Repository.Services.User
{
    public class UserService : IUserService
    {
        private readonly CBContext _context;
        private readonly IMapper _mapper;
        private readonly ICommonService<CB_User> _userRepository;
        private readonly IdEncoder _idEncoder;


        public UserService(ICommonService<CB_User> userRepository, IMapper mapper, CBContext context, IdEncoder idEncoder)
        {
            _userRepository = userRepository;
            _mapper = mapper;
            _context = context;
            _idEncoder = idEncoder;
        }

        // ================= CREATE =================
        // ================= CREATE =================
        public async Task<UserResDTO> CreateUserAsync(UserDTO dto, int? loggedInUserId)
        {
            if (dto.Password != dto.ConfirmPassword)
                throw new Exception("Password mismatch");

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            // Convert List<int> to CSV string
            var roleIdsCsv = dto.RoleId != null && dto.RoleId.Any()
                ? string.Join(",", dto.RoleId)
                : null;

            // ✅ CALL STORED PROCEDURE (NO manual connection)
            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_UserInsertWithRoles @FullName, @Email, @Password, @DepartmentId, @RoleIds, @EntryBy",
                new SqlParameter("@FullName", dto.FullName),
                new SqlParameter("@Email", dto.Email),
                new SqlParameter("@Password", hashedPassword),
                new SqlParameter("@DepartmentId", (object?)dto.DepartmentId ?? DBNull.Value),
                new SqlParameter("@RoleIds", (object?)roleIdsCsv ?? DBNull.Value),
                new SqlParameter("@EntryBy", (object?)loggedInUserId ?? DBNull.Value)
            );

            // ✅ Get latest inserted user (safe approach for now)
            var user = await _context.CB_Users
                .OrderByDescending(u => u.UserId)
                .Include(u => u.CB_UserRoleMappings)
                    .ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .FirstOrDefaultAsync();

            if (user == null)
                throw new Exception("User creation failed");

            return new UserResDTO
            {
                UserId = _idEncoder.Encode(user.UserId),
                FullName = user.FullName,
                Email = user.Email,
                DepartmentId = user.DepartmentId,
                IsActive = user.IsActive,
                EntryDate = user.EntryDate,
                Roles = user.CB_UserRoleMappings
                    .Where(x => x.IsActive == true)
                    .Select(x => x.Role.RoleName)
                    .ToList()
            };
        }



        // ================= GET ALL =================
        public async Task<List<UserResDTO>> GetUsersAsync()
        {
            var users = await _context.CB_Users
                .Where(u => u.IsDeleted == false)
                .Include(u => u.CB_UserRoleMappings)
                    .ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .ToListAsync();

            return users.Select(u => new UserResDTO
            {
                UserId = _idEncoder.Encode(u.UserId),
                FullName = u.FullName,
                Email = u.Email,
                DepartmentId = u.DepartmentId,
                IsActive = u.IsActive,
                EntryDate = u.EntryDate,
                Roles = u.CB_UserRoleMappings
                    .Where(ur => ur.IsActive == true)
                    .Select(ur => ur.Role.RoleName)
                    .ToList()
            }).ToList();
        }

        // ================= GET BY ID =================
        public async Task<UserResDTO> GetUserByIdAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);
            var user = await _context.CB_Users
                .Include(u => u.CB_UserRoleMappings)
                    .ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .FirstOrDefaultAsync(u => u.UserId == id && u.IsDeleted == false);

            if (user == null) throw new Exception("User not found");

            return new UserResDTO
            {
                UserId = _idEncoder.Encode(user.UserId),
                FullName = user.FullName,
                Email = user.Email,
                DepartmentId = user.DepartmentId,
                IsActive = user.IsActive,
                EntryDate = user.EntryDate,
                Roles = user.CB_UserRoleMappings
                    .Where(ur => ur.IsActive == true)
                    .Select(ur => ur.Role.RoleName)
                    .ToList()
            };
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
                new SqlParameter("@UserId", _idEncoder.Decode(dto.UserId)),
                new SqlParameter("@FullName", dto.FullName),
                new SqlParameter("@Email", dto.Email),
                new SqlParameter("@Password", (object?)password ?? DBNull.Value),
                new SqlParameter("@DepartmentId", dto.DepartmentId),
                new SqlParameter("@IsActive", dto.IsActive)
            );

            return true;
        }

        // ================= DELETE =================
        public async Task<bool> DeleteUserAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);
            var user = await _context.CB_Users.FindAsync(id);
            if (user == null) throw new Exception("User not found");

            // Soft delete
            user.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
