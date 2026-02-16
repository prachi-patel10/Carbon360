using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using AutoMapper;
using Microsoft.EntityFrameworkCore.Query.Internal;
using ProjectApp.Repository.Utilities.Auth;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Core.Entities;
using ProjectApp.Core.DTOs.Account.Login;

namespace pr.Repository.Services.Auth
{
    public class AuthService : IAuthService
    {

        //private readonly IMapper _mapper;
        private readonly JWTService _jwtService;
        private readonly ICommonService<Users> _userRepository;

        public AuthService(JWTService jWTService, ICommonService<Users> userRepository)
        {
            _jwtService = jWTService;
            _userRepository = userRepository;

        }
        public async Task<LoginResDTO> LoginAsyc(LoginDTO loginDTO)
        {
            var user = await _userRepository.GetAllByFilterAsync(u => u.UserName.ToLower() == loginDTO.UserName.ToLower());

            if (user == null)
            {
                throw new Exception("invalid username or password");
            }

            if (!string.Equals(user.UserName, loginDTO.UserName, StringComparison.Ordinal))
                throw new Exception("Invalid username or password.");
            bool isPassValid = BCrypt.Net.BCrypt.Verify(loginDTO.Password, user.Password);

            if (!isPassValid)
            {
                throw new Exception("Invalid username or password.");
            }
            var token = _jwtService.GenerateToken(user.UserName, user.RoleId, user.Id);

            return new LoginResDTO
            {
                token = token,
                roleId = user.RoleId,
                UserName = user.UserName
            };

            //throw new NotImplementedException();
        }
    }
}
