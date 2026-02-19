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

            // Convert List<int> to CSV string
            var roleIdsCsv = dto.RoleId != null && dto.RoleId.Any()
                ? string.Join(",", dto.RoleId)
                : null;

            int newUserId = 0;

            // Use ADO style call because SP returns scalar value
            using (var connection = _context.Database.GetDbConnection())
            {
                await connection.OpenAsync();

                using (var command = connection.CreateCommand())
                {
                    command.CommandText = "USP_CB_UserInsertWithRoles";
                    command.CommandType = System.Data.CommandType.StoredProcedure;

                    command.Parameters.Add(new SqlParameter("@FullName", dto.FullName));
                    command.Parameters.Add(new SqlParameter("@Email", dto.Email));
                    command.Parameters.Add(new SqlParameter("@Password", hashedPassword));
                    command.Parameters.Add(new SqlParameter("@DepartmentId", (object?)dto.DepartmentId ?? DBNull.Value));
                    command.Parameters.Add(new SqlParameter("@RoleIds", (object?)roleIdsCsv ?? DBNull.Value));
                    command.Parameters.Add(new SqlParameter("@EntryBy", (object?)loggedInUserId ?? DBNull.Value));

                    var result = await command.ExecuteScalarAsync();

                    newUserId = Convert.ToInt32(result);
                }
            }

            // Fetch full user with roles
            var user = await _context.CB_Users
                .Include(u => u.CB_UserRoleMappings)
                    .ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .FirstOrDefaultAsync(u => u.UserId == newUserId);

            if (user == null)
                throw new Exception("User creation failed");

            return new UserResDTO
            {
                UserId = user.UserId,
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
                UserId = u.UserId,
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
        public async Task<UserResDTO> GetUserByIdAsync(int id)
        {
            var user = await _context.CB_Users
                .Include(u => u.CB_UserRoleMappings)
                    .ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .FirstOrDefaultAsync(u => u.UserId == id && u.IsDeleted == false);

            if (user == null) throw new Exception("User not found");

            return new UserResDTO
            {
                UserId = user.UserId,
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
            var user = await _context.CB_Users.FindAsync(id);
            if (user == null) throw new Exception("User not found");

            // Soft delete
            user.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
