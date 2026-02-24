using AutoMapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Account.User;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Utilities.Auth;
using ProjectApp.Repository.Utilities.SP;

namespace ProjectApp.Repository.Services.User
{
    public class UserService : IUserService
    {
        private readonly CBContext _context;
        private readonly IMapper _mapper;
        private readonly ICommonService<CB_User> _userRepository;
        private readonly IdEncoder _idEncoder;

        public UserService(
            ICommonService<CB_User> userRepository,
            IMapper mapper,
            CBContext context,
            IdEncoder idEncoder)
        {
            _userRepository = userRepository;
            _mapper = mapper;
            _context = context;
            _idEncoder = idEncoder;
        }

        // ================= CREATE =================
        public async Task<UserResDTO> CreateUserAsync(UserDTO dto, int? loggedInUserId)
        {
            if (dto.Password != dto.ConfirmPassword)
                throw new Exception("Password mismatch");

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            int? departmentId = null;

            if (!string.IsNullOrEmpty(dto.DepartmentId))
            {
                departmentId = _idEncoder.Decode(dto.DepartmentId);
            }

            var roleIdsCsv = dto.RoleId != null && dto.RoleId.Any()
                ? string.Join(",", dto.RoleId.Select(r => _idEncoder.Decode(r)))
                : null;

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_UserInsertWithRoles @Fname, @Lname, @UserName, @Email, @Password, @DepartmentId, @RoleIds, @EntryBy",
                new SqlParameter("@Fname", dto.FName),
                new SqlParameter("@Lname", dto.LName),
                new SqlParameter("@UserName", dto.UserName),
                new SqlParameter("@Email", dto.Email),
                new SqlParameter("@Password", hashedPassword),
                new SqlParameter("@DepartmentId", (object?)departmentId ?? DBNull.Value),
                new SqlParameter("@RoleIds", (object?)roleIdsCsv ?? DBNull.Value),
                new SqlParameter("@EntryBy", (object?)loggedInUserId ?? DBNull.Value)
            );
            var user = await _context.CB_Users
                .OrderByDescending(u => u.UserId)
                .Include(u => u.CB_UserRoleMappings)
                    .ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .FirstOrDefaultAsync();

            if (user == null)
                throw new Exception("User creation failed");

            return MapToResponse(user);
        }

        // GET ALL USERS
        public async Task<List<UserResDTO>> GetUsersAsync()
        {
            var users = await _context.CB_Users
                .Where(u => u.IsDeleted == false)
                .Include(u => u.CB_UserRoleMappings)
                    .ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .ToListAsync();

            return users.Select(u => MapToResponse(u)).ToList();
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

            if (user == null)
                throw new Exception("User not found");

            return MapToResponse(user);
        }

        // ================= GET BY USERNAME =================
        public async Task<UserResDTO> GetUserByUsernameAsync(string username)
        {
            var user = await _context.CB_Users
                .FirstOrDefaultAsync(u => u.UserName == username && u.IsDeleted == false);

            if (user == null)
                throw new Exception("User not found");

            return MapToResponse(user);
        }

        // ================= UPDATE =================
        public async Task<bool> UpdateUserAsync(UserUpdateDTO dto)
        {
            // 🔐 Decode UserId
            int userId = _idEncoder.Decode(dto.UserId);

            // 🔐 Decode DepartmentId (if exists)
            int? departmentId = null;
            if (!string.IsNullOrEmpty(dto.DepartmentId))
            {
                departmentId = _idEncoder.Decode(dto.DepartmentId);
            }

            // 🔐 Decode RoleIds (if exists)
            string? roleIdsCsv = null;
            if (dto.RoleIds != null && dto.RoleIds.Any())
            {
                var decodedRoleIds = dto.RoleIds
                    .Select(r => _idEncoder.Decode(r))
                    .ToList();

                roleIdsCsv = string.Join(",", decodedRoleIds);
            }

            // 🔐 Hash password only if provided
            string? password = null;
            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                password = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            }

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_UserUpdateWithRoles @UserId, @Fname, @Lname, @UserName, @Email, @Password, @DepartmentId, @IsActive, @RoleIds",
                new SqlParameter("@UserId", userId),
                new SqlParameter("@Fname", dto.FName),
                new SqlParameter("@Lname", dto.LName),
                new SqlParameter("@UserName", dto.UserName),
                new SqlParameter("@Email", dto.Email),
                new SqlParameter("@Password", (object?)password ?? DBNull.Value),
                new SqlParameter("@DepartmentId", (object?)departmentId ?? DBNull.Value),
                new SqlParameter("@IsActive", dto.IsActive),
                new SqlParameter("@RoleIds", (object?)roleIdsCsv ?? DBNull.Value)
            );

            return true;
        }
        // ================= PATCH ACTIVE/INACTIVE =================
        public async Task<bool> UpdateUserStatusAsync(UserStatusUpdateDTO dto)
        {
            int userId = _idEncoder.Decode(dto.UserId);

            var user = await _context.CB_Users.FindAsync(userId);
            if (user == null) throw new Exception("User not found");

            user.IsActive = dto.IsActive;
            await _context.SaveChangesAsync();

            return true;
        }

        // ================= DELETE =================
        public async Task<bool> DeleteUserAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            var user = await _context.CB_Users.FindAsync(id);
            if (user == null) throw new Exception("User not found");

            user.IsDeleted = true;
            await _context.SaveChangesAsync();

            return true;
        }

        // SEARCH USERS
        public async Task<List<UserResDTO>> SearchUsersAsync(string search)
        {
            var query = _context.CB_Users
                .Where(u => u.IsDeleted == false)
                .Include(u => u.CB_UserRoleMappings)
                    .ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
                query = query.Where(u => u.Fname.Contains(search)
                                      || u.Lname.Contains(search)
                                      || u.UserName.Contains(search));

            var users = await query.ToListAsync();
            return users.Select(u => MapToResponse(u)).ToList();
        }


        //SEARCH WITH PAGINATION
        public async Task<(List<UserResDTO> Users, int TotalRecords)>
SearchUsersPaginatedAsync(SearchRequest request)
        {
            var query = _context.CB_Users
                .Where(u => u.IsDeleted == false)
                .Include(u => u.CB_UserRoleMappings)
                    .ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .AsQueryable();

            // SEARCH
            if (!string.IsNullOrEmpty(request.Search))
            {
                query = query.Where(u =>
                    u.Fname.Contains(request.Search) ||
                    u.Lname.Contains(request.Search) ||
                    u.UserName.Contains(request.Search));
            }

            // ACTIVE FILTER
            if (request.IsActive.HasValue)
            {
                query = query.Where(u => u.IsActive == request.IsActive.Value);
            }

            // TOTAL COUNT BEFORE PAGINATION
            int totalRecords = await query.CountAsync();

            // SORTING
            if (!string.IsNullOrEmpty(request.SortColumn))
            {
                if (request.SortColumn == "Fname")
                    query = request.SortDirection == "DESC"
                        ? query.OrderByDescending(u => u.Fname)
                        : query.OrderBy(u => u.Fname);

                else if (request.SortColumn == "UserName")
                    query = request.SortDirection == "DESC"
                        ? query.OrderByDescending(u => u.UserName)
                        : query.OrderBy(u => u.UserName);

                else
                    query = query.OrderBy(u => u.UserId);
            }

            // PAGINATION
            var users = await query
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync();

            var result = users.Select(u => MapToResponse(u)).ToList();

            return (result, totalRecords);
        }


        // ================= PRIVATE MAPPER =================
        private UserResDTO MapToResponse(CB_User user)
        {
             return new UserResDTO
    {
        UserId = _idEncoder.Encode(user.UserId),
        FName = user.Fname,
        LName = user.Lname,
        UserName = user.UserName,
        Email = user.Email,
        DepartmentId = user.DepartmentId.HasValue ? _idEncoder.Encode(user.DepartmentId.Value) : null,
        DepartmentName = user.Department != null ? user.Department.DepartmentName : "N/A", // <-- ADD THIS
        IsActive = user.IsActive,
        EntryDate = user.EntryDate,
        Roles = user.CB_UserRoleMappings?
            .Where(x => x.IsActive == true)
            .Select(x => x.Role.RoleName)
            .ToList()
    };
        }
    }
}
