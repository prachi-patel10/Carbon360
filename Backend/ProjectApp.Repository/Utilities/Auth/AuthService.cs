using AutoMapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Query.Internal;
using ProjectApp.Core.DTOs.Account.Login;
using ProjectApp.Core.Entities;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Utilities.Auth;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;

namespace pr.Repository.Services.Auth
{
    public class AuthService : IAuthService
    {

        //private readonly IMapper _mapper;
        private readonly JWTService _jwtService;
        private readonly CBContext _cbContext;
        private readonly ICommonService<CB_User> _userRepository;
        private readonly IUserContext _userContext;

        public AuthService(JWTService jWTService, ICommonService<CB_User> userRepository,CBContext cbContext,IUserContext userContext)
        {
            _jwtService = jWTService;
            _userRepository = userRepository;
            _cbContext = cbContext;
            _userContext = userContext;

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
                Roles = roles,                     // send all roles
                CurrentRole = roles.FirstOrDefault(), // default role
                Token = token
            };
        }


        public async Task LogoutAsync(int userId)
        {
            await _cbContext.Database.ExecuteSqlRawAsync(
           "EXEC SP_LogoutUser @UserId",
           new SqlParameter("@UserId", userId)
       );
        }

        public async Task<LoginResDTO> SwitchRoleAsync(SwitchRoleDTO dto)
        {
            int userId = GetCurrentUserId();

            // Get the user
            var user = await _userRepository.GetAllByFilterAsync(
        u => u.UserId == userId && (u.IsDeleted == false),
        true
    );

            if (user == null)
                throw new Exception("User not found");

            // Get all roles for this user
            var roles = await _cbContext.Database
                .SqlQueryRaw<string>("EXEC USP_CB_GetUserRoles @UserId",
                    new SqlParameter("@UserId", user.UserId))
                .ToListAsync();

            if (!roles.Contains(dto.SelectedRole))
                throw new Exception("Role not assigned to user");

            // Generate a new JWT for this selected role
            string newToken = _jwtService.GenerateToken(user, new List<string> { dto.SelectedRole });
            return new LoginResDTO
            {
                UserName = user.UserName,
                Roles = roles,
                CurrentRole = dto.SelectedRole,
                Token = newToken
            };

        }
    }
}
