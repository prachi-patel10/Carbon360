using AutoMapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ProjectApp.Core.DTOs.Account.ForgotPassword;
using ProjectApp.Core.DTOs.Account.Login;
using ProjectApp.Core.Entities;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Email;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Utilities.Auth;

namespace pr.Repository.Services.Auth
{
    public class AuthService : IAuthService
    {
        private readonly JWTService _jwtService;
        private readonly CBContext _cbContext;
        private readonly ICommonService<CB_User> _userRepository;
        private readonly IUserContext _userContext;
        private readonly IEmailService _emailService;       
        private readonly IConfiguration _config;            

        public AuthService(
            JWTService jWTService,
            ICommonService<CB_User> userRepository,
            CBContext cbContext,
            IUserContext userContext,
            IEmailService emailService,                    
            IConfiguration config)                         
        {
            _jwtService = jWTService;
            _userRepository = userRepository;
            _cbContext = cbContext;
            _userContext = userContext;
            _emailService = emailService;                   
            _config = config;                               
        }

        private int GetCurrentUserId()
        {
            if (_userContext == null)
                throw new Exception("User context is not initialized");

            return _userContext.UserId;
        }

        public async Task<LoginResDTO> LoginAsyc(LoginDTO loginDTO)
        {
            var user = _cbContext.CB_Users
                .FromSqlRaw("EXEC USP_CB_LoginUser @Email",
                    new SqlParameter("@Email", loginDTO.Email))
                .AsEnumerable()
                .FirstOrDefault();

            if (user == null)
                throw new Exception("User not found");

            if (!BCrypt.Net.BCrypt.Verify(loginDTO.Password, user.Password))
                throw new Exception("Invalid password");

            var roles = await _cbContext.Database
                .SqlQueryRaw<string>(
                    "EXEC USP_CB_GetUserRoles @UserId",
                    new SqlParameter("@UserId", user.UserId))
                .ToListAsync();

            var token = _jwtService.GenerateToken(user, roles);

            return new LoginResDTO
            {
                UserName = user.UserName,
                FirstName = user.Fname,
                Roles = roles,
                CurrentRole = roles.FirstOrDefault(),
                Token = token
            };
        }

        public async Task LogoutAsync(int userId)
        {
            await _cbContext.Database.ExecuteSqlRawAsync(
                "EXEC SP_LogoutUser @UserId",
                new SqlParameter("@UserId", userId));
        }

        public async Task<LoginResDTO> SwitchRoleAsync(SwitchRoleDTO dto)
        {
            int userId = GetCurrentUserId();

            var user = await _userRepository.GetAllByFilterAsync(
                u => u.UserId == userId && u.IsDeleted == false, true);

            if (user == null)
                throw new Exception("User not found");

            var roles = await _cbContext.Database
                .SqlQueryRaw<string>("EXEC USP_CB_GetUserRoles @UserId",
                    new SqlParameter("@UserId", user.UserId))
                .ToListAsync();

            if (!roles.Contains(dto.SelectedRole))
                throw new Exception("Role not assigned to user");

            string newToken = _jwtService.GenerateToken(user, new List<string> { dto.SelectedRole });

            return new LoginResDTO
            {
                UserName = user.UserName,
                FirstName = user.Fname,
                Roles = roles,
                CurrentRole = dto.SelectedRole,
                Token = newToken
            };
        }

        public async Task<ForgotPasswordResDTO> ForgotPasswordAsync(ForgotPasswordDTO dto)
        {
            // Direct fast query — no SP overhead
            var userExists = await _cbContext.CB_Users
                .AnyAsync(u => u.Email == dto.Email && u.IsDeleted == false);

            // Immediately throw if not found
            if (!userExists)
                throw new Exception("No account found with this email address.");

            // Only continues if user exists
            var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
                               .Replace("+", "-").Replace("/", "_").Replace("=", "");
            var expiry = DateTime.UtcNow.AddHours(1);

            await _cbContext.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_SavePasswordResetToken @Email, @Token, @ExpiresAt",
                new SqlParameter("@Email", dto.Email),
                new SqlParameter("@Token", token),
                new SqlParameter("@ExpiresAt", expiry));

            var resetLink = $"{_config["AppSettings:FrontendUrl"]}/reset-password?token={token}";

            var isDevelopment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";
            var sendTo = isDevelopment
                ? _config["AppSettings:NotifyEmail"]
                : dto.Email;

            await _emailService.SendPasswordResetEmailAsync(sendTo, resetLink);

            return new ForgotPasswordResDTO { Message = "Reset link sent to your email." };
        }
        public async Task<ForgotPasswordResDTO> ResetPasswordAsync(ResetPasswordDTO dto) //  added
        {
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);

            await _cbContext.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_ResetPassword @Token, @NewPasswordHash",
                new SqlParameter("@Token", dto.Token),
                new SqlParameter("@NewPasswordHash", hashedPassword));

            return new ForgotPasswordResDTO { Message = "Password reset successfully." };
        }
    }
}