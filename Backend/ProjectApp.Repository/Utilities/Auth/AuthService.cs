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

        public AuthService(JWTService jWTService, ICommonService<CB_User> userRepository,CBContext cbContext)
        {
            _jwtService = jWTService;
            _userRepository = userRepository;
            _cbContext = cbContext;
        }
        public async Task<LoginResDTO> LoginAsyc(LoginDTO loginDTO)
        {
            var user = await _cbContext.CB_Users
                .FromSqlRaw("EXEC SP_LoginUser @Email",
                    new SqlParameter("@Email", loginDTO.Email))
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (user == null)
                throw new Exception("User not found");

            if (!BCrypt.Net.BCrypt.Verify(loginDTO.Password, user.Password))
                throw new Exception("Invalid password");

            // 🔹 Get Roles using SP
            var roles = await _cbContext.Database
                .SqlQueryRaw<string>(
                    "EXEC SP_GetUserRoles @UserId",
                    new SqlParameter("@UserId", user.UserId))
                .ToListAsync();

            // 🔹 Generate JWT
            var token = _jwtService.GenerateToken(user, roles);

            return new LoginResDTO
            {
                
                FullName = user.FullName,
                RoleName = roles.FirstOrDefault(),
                token = token,
               
            };
        }

        public async Task LogoutAsync(int userId)
        {
            await _cbContext.Database.ExecuteSqlRawAsync(
           "EXEC SP_LogoutUser @UserId",
           new SqlParameter("@UserId", userId)
       );
        }
    }
}
