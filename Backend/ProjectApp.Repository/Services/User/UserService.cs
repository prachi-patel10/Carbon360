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

        // ================= SEARCH WITH PAGINATION =================
        public async Task<(List<UserResDTO> Users, int TotalRecords)>
     SearchUsersPaginatedAsync(SearchRequestDTO request)
        {
            var deptIdList = DecodeIdList(request.DepartmentIds);
            var roleIdList = DecodeIdList(request.RoleIds);

            var allowedColumns = new[] { "FName", "LName", "UserName", "Email", "IsActive", "EntryDate" };
            var sortCol = allowedColumns.Contains(request.SortColumn) ? request.SortColumn : "FName";
            var sortDir = request.SortDirection?.ToUpper() == "DESC" ? "DESC" : "ASC";

            // ── Base query ────────────────────────────────────────────
            var query = _context.CB_Users
                .Where(u => u.IsDeleted == false)
                .AsQueryable();

            // ── Search ────────────────────────────────────────────────
            if (!string.IsNullOrWhiteSpace(request.Search))
                query = query.Where(u =>
                    u.Fname.Contains(request.Search) ||
                    u.Lname.Contains(request.Search) ||
                    u.UserName.Contains(request.Search) ||
                    u.Email.Contains(request.Search));

            // ── Active filter ─────────────────────────────────────────
            if (request.IsActive.HasValue)
                query = query.Where(u => u.IsActive == request.IsActive.Value);

            // ── Department filter ─────────────────────────────────────
            if (deptIdList.Any())
                query = query.Where(u =>
                    u.DepartmentId.HasValue &&
                    deptIdList.Contains(u.DepartmentId.Value));

            // ── Role filter ───────────────────────────────────────────
            if (roleIdList.Any())
                query = query.Where(u =>
                    u.CB_UserRoleMappings.Any(m =>
                        m.IsActive == true &&
                        m.RoleId != null &&
                        roleIdList.Contains((int)m.RoleId)));

            // ── Total count ───────────────────────────────────────────
            int totalRecords = await query.CountAsync();

            // ── Sorting ───────────────────────────────────────────────
            query = (sortCol, sortDir) switch
            {
                ("LName", "DESC") => query.OrderByDescending(u => u.Lname),
                ("LName", _) => query.OrderBy(u => u.Lname),
                ("UserName", "DESC") => query.OrderByDescending(u => u.UserName),
                ("UserName", _) => query.OrderBy(u => u.UserName),
                ("Email", "DESC") => query.OrderByDescending(u => u.Email),
                ("Email", _) => query.OrderBy(u => u.Email),
                ("IsActive", "DESC") => query.OrderByDescending(u => u.IsActive),
                ("IsActive", _) => query.OrderBy(u => u.IsActive),
                ("EntryDate", "DESC") => query.OrderByDescending(u => u.EntryDate),
                ("EntryDate", _) => query.OrderBy(u => u.EntryDate),
                (_, "DESC") => query.OrderByDescending(u => u.Fname),
                _ => query.OrderBy(u => u.Fname)
            };

            // ── Pagination + Include ──────────────────────────────────
            var users = await query
                .Include(u => u.CB_UserRoleMappings).ThenInclude(ur => ur.Role)
                .Include(u => u.Department)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync();

            return (users.Select(MapToResponse).ToList(), totalRecords);
        }

        // ── Decode comma-separated encoded IDs → List<int> ───────────
        private List<int> DecodeIdList(string? encodedIds)
        {
            if (string.IsNullOrWhiteSpace(encodedIds))
                return new List<int>();
            try
            {
                return encodedIds
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(id =>
                    {
                        try { return (int?)_idEncoder.Decode(id.Trim()); }
                        catch { return null; }
                    })
                    .Where(id => id.HasValue && id.Value > 0)
                    .Select(id => id!.Value)
                    .ToList();
            }
            catch { return new List<int>(); }
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