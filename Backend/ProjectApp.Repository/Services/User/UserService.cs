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
                departmentId = _idEncoder.Decode(dto.DepartmentId);

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
                .Include(u => u.CB_UserRoleMappings).ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .FirstOrDefaultAsync();

            if (user == null) throw new Exception("User creation failed");
            return MapToResponse(user);
        }

        // ================= GET ALL =================
        public async Task<List<UserResDTO>> GetUsersAsync()
        {
            var users = await _context.CB_Users
                .Where(u => u.IsDeleted == false)
                .Include(u => u.CB_UserRoleMappings).ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .ToListAsync();

            return users.Select(u => MapToResponse(u)).ToList();
        }

        // ================= GET BY ID =================
        public async Task<UserResDTO> GetUserByIdAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            var user = await _context.CB_Users
                .Include(u => u.CB_UserRoleMappings).ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .FirstOrDefaultAsync(u => u.UserId == id && u.IsDeleted == false);

            if (user == null) throw new Exception("User not found");
            return MapToResponse(user);
        }

        // ================= GET BY USERNAME =================
        public async Task<UserResDTO> GetUserByUsernameAsync(string username)
        {
            var user = await _context.CB_Users
                .FirstOrDefaultAsync(u => u.UserName == username && u.IsDeleted == false);

            if (user == null) throw new Exception("User not found");
            return MapToResponse(user);
        }

        // ================= UPDATE =================
        public async Task<bool> UpdateUserAsync(UserUpdateDTO dto)
        {
            int userId = _idEncoder.Decode(dto.UserId);

            int? departmentId = null;
            if (!string.IsNullOrEmpty(dto.DepartmentId))
                departmentId = _idEncoder.Decode(dto.DepartmentId);

            string? roleIdsCsv = null;
            if (dto.RoleIds != null && dto.RoleIds.Any())
                roleIdsCsv = string.Join(",", dto.RoleIds.Select(r => _idEncoder.Decode(r)));

            string? password = null;
            if (!string.IsNullOrWhiteSpace(dto.Password))
                password = BCrypt.Net.BCrypt.HashPassword(dto.Password);

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

        // ================= STATUS =================
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

        // ================= SEARCH (simple) =================
        public async Task<List<UserResDTO>> SearchUsersAsync(string search)
        {
            var query = _context.CB_Users
                .Where(u => u.IsDeleted == false)
                .Include(u => u.CB_UserRoleMappings).ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
                query = query.Where(u =>
                    u.Fname.Contains(search) ||
                    u.Lname.Contains(search) ||
                    u.UserName.Contains(search));

            var users = await query.ToListAsync();
            return users.Select(u => MapToResponse(u)).ToList();
        }

        // ================= SEARCH WITH PAGINATION=================
        public async Task<(List<UserResDTO> Users, int TotalRecords)>
            SearchUsersPaginatedAsync(SearchRequestDTO request)
        {
            var deptIdsCsv = DecodeToCsv(request.DepartmentIds);
            var roleIdsCsv = DecodeToCsv(request.RoleIds);

            var allowedColumns = new[] { "FName", "LName", "UserName", "Email", "IsActive", "EntryDate" };
            var sortCol = allowedColumns.Contains(request.SortColumn) ? request.SortColumn : "FName";
            var sortDir = request.SortDirection?.ToUpper() == "DESC" ? "DESC" : "ASC";

            var search = string.IsNullOrWhiteSpace(request.Search) ? null : request.Search.Trim();

            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_UserSearch";
            cmd.CommandType = System.Data.CommandType.StoredProcedure;

            cmd.Parameters.Add(new SqlParameter("@Search", (object?)search ?? DBNull.Value));
            cmd.Parameters.Add(new SqlParameter("@IsActive", (object?)request.IsActive ?? DBNull.Value));
            cmd.Parameters.Add(new SqlParameter("@PageNumber", request.PageNumber));
            cmd.Parameters.Add(new SqlParameter("@PageSize", request.PageSize));
            cmd.Parameters.Add(new SqlParameter("@SortColumn", sortCol));
            cmd.Parameters.Add(new SqlParameter("@SortDirection", sortDir));
            cmd.Parameters.Add(new SqlParameter("@DepartmentIds", (object?)deptIdsCsv ?? DBNull.Value));
            cmd.Parameters.Add(new SqlParameter("@RoleIds", (object?)roleIdsCsv ?? DBNull.Value));

            var roleRows = new List<(int UserId, string RoleName)>();
            var userResults = new List<UserResDTO>();
            int totalRecords = 0;

            using var reader = await cmd.ExecuteReaderAsync();

            //Result set 1: paged users
            while (await reader.ReadAsync())
            {
                totalRecords = reader["TotalRecords"] != DBNull.Value
                    ? Convert.ToInt32(reader["TotalRecords"]) : 0;

                int rawUserId = Convert.ToInt32(reader["UserId"]);
                int? rawDeptId = reader["DepartmentId"] != DBNull.Value
                    ? Convert.ToInt32(reader["DepartmentId"]) : null;

                userResults.Add(new UserResDTO
                {
                    UserId = _idEncoder.Encode(rawUserId),
                    FName = reader["FName"]?.ToString() ?? "",
                    LName = reader["LName"]?.ToString() ?? "",
                    UserName = reader["UserName"]?.ToString() ?? "",
                    Email = reader["Email"]?.ToString() ?? "",
                    DepartmentId = rawDeptId.HasValue
                                         ? _idEncoder.Encode(rawDeptId.Value)
                                         : null,
                    DepartmentName = reader["DepartmentName"]?.ToString() ?? "N/A",
                    IsActive = reader["IsActive"] != DBNull.Value
                                         && Convert.ToBoolean(reader["IsActive"]),
                    EntryDate = reader["EntryDate"] != DBNull.Value
                                         ? Convert.ToDateTime(reader["EntryDate"])
                                         : null
                });
            }
            //Result set 2: roles for those users
            if (await reader.NextResultAsync())
            {
                while (await reader.ReadAsync())
                {
                    roleRows.Add((
                        UserId: Convert.ToInt32(reader["UserId"]),
                        RoleName: reader["RoleName"]?.ToString() ?? ""
                    ));
                }
            }
            await conn.CloseAsync();

            //Attach roles to each UserResDTO 
            var rolesByRawId = roleRows
                .GroupBy(r => r.UserId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(r => r.RoleName).ToList()
                );

            foreach (var dto in userResults)
            {
                int rawId = _idEncoder.Decode(dto.UserId);
                dto.Roles = rolesByRawId.TryGetValue(rawId, out var roles)
                    ? roles
                    : new List<string>();
            }

            return (userResults, totalRecords);
        }

        private string? DecodeToCsv(string? encodedIds)
        {
            if (string.IsNullOrWhiteSpace(encodedIds)) return null;

            var decoded = encodedIds
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(id =>
                {
                    try { return (int?)_idEncoder.Decode(id); }
                    catch { return null; }
                })
                .Where(id => id.HasValue && id.Value > 0)
                .Select(id => id!.Value.ToString())
                .ToList();

            return decoded.Any() ? string.Join(",", decoded) : null;
        }

        // ================= MAPPER =================
        private UserResDTO MapToResponse(CB_User user)
        {
            return new UserResDTO
            {
                UserId = _idEncoder.Encode(user.UserId),
                FName = user.Fname,
                LName = user.Lname,
                UserName = user.UserName,
                Email = user.Email,
                DepartmentId = user.DepartmentId.HasValue
                                    ? _idEncoder.Encode(user.DepartmentId.Value)
                                    : null,
                DepartmentName = user.Department != null
                                    ? user.Department.DepartmentName
                                    : "N/A",
                IsActive = user.IsActive,
                EntryDate = user.EntryDate,
                Roles = user.CB_UserRoleMappings?
                                    .Where(x => x.IsActive == true)
                                    .Select(x => x.Role.RoleName)
                                    .ToList()
                                 ?? new List<string>()
            };
        }


    }
}