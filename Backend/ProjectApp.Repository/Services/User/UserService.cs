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

            var roleIdsCsv = dto.RoleId != null && dto.RoleId.Any()
                ? string.Join(",", dto.RoleId)
                : null;

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_UserInsertWithRoles @Fname, @Lname, @UserName, @Email, @Password, @DepartmentId, @RoleIds, @EntryBy",
                new SqlParameter("@Fname", dto.FName),
                new SqlParameter("@Lname", dto.LName),
                new SqlParameter("@UserName", dto.UserName),
                new SqlParameter("@Email", dto.Email),
                new SqlParameter("@Password", hashedPassword),
                new SqlParameter("@DepartmentId", (object?)dto.DepartmentId ?? DBNull.Value),
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
            var password = string.IsNullOrEmpty(dto.Password)
                ? null
                : BCrypt.Net.BCrypt.HashPassword(dto.Password);

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_UserUpdate @UserId, @Fname, @Lname, @UserName, @Email, @Password, @DepartmentId, @IsActive",
                new SqlParameter("@UserId", _idEncoder.Decode(dto.UserId)),
                new SqlParameter("@Fname", dto.FName),
                new SqlParameter("@Lname", dto.LName),
                new SqlParameter("@UserName", dto.UserName),
                new SqlParameter("@Email", dto.Email),
                new SqlParameter("@Password", (object?)password ?? DBNull.Value),
                new SqlParameter("@DepartmentId", dto.DepartmentId.HasValue ? (object)dto.DepartmentId.Value : DBNull.Value),
                new SqlParameter("@IsActive", dto.IsActive)
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
        public async Task<(List<UserResDTO> Users, int TotalRecords)> SearchUsersPaginatedAsync(SearchRequest request)
        {
            var usersFromDb = await _context.CB_Users // EF model is CB_User
                .FromSqlRaw(
                    "EXEC USP_CB_UserSearch @Search, @IsActive, @PageNumber, @PageSize, @SortColumn, @SortDirection",
                    new SqlParameter("@Search", (object?)request.Search ?? DBNull.Value),
                    new SqlParameter("@IsActive", (object?)request.IsActive ?? DBNull.Value),
                    new SqlParameter("@PageNumber", request.PageNumber),
                    new SqlParameter("@PageSize", request.PageSize),
                    new SqlParameter("@SortColumn", (object?)request.SortColumn ?? "FName"),
                    new SqlParameter("@SortDirection", (object?)request.SortDirection ?? "ASC")
                )
                .ToListAsync();

            // Load navigation properties
            foreach (var user in usersFromDb)
            {
                _context.Entry(user)
                    .Collection(u => u.CB_UserRoleMappings)
                    .Query()
                    .Where(ur => ur.IsActive == true)
                    .Include(ur => ur.Role)
                    .Load();

                _context.Entry(user)
                    .Reference(u => u.Department)
                    .Load();
            }

            var result = usersFromDb.Select(u => MapToResponse(u)).ToList();

            // Total count
            int totalRecords = 0;
            using (var command = _context.Database.GetDbConnection().CreateCommand())
            {
                command.CommandText = "SELECT COUNT(*) FROM CB_USER WHERE IsDeleted = 0" +
                    (string.IsNullOrEmpty(request.Search) ? "" : $" AND (FName LIKE '%{request.Search}%' OR LName LIKE '%{request.Search}%' OR UserName LIKE '%{request.Search}%')") +
                    (request.IsActive.HasValue ? $" AND IsActive = {(request.IsActive.Value ? 1 : 0)}" : "");
                command.CommandType = System.Data.CommandType.Text;

                await _context.Database.OpenConnectionAsync();
                totalRecords = Convert.ToInt32(await command.ExecuteScalarAsync());
                await _context.Database.CloseConnectionAsync();
            }

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
                DepartmentId = user.DepartmentId,
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
