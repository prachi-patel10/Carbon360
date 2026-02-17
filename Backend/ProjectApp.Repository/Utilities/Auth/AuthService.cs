using AutoMapper;
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
        private readonly ICommonService<CB_User> _userRepository;

        public AuthService(JWTService jWTService, ICommonService<CB_User> userRepository)
        {
            _jwtService = jWTService;
            _userRepository = userRepository;

        }
        public async Task<LoginResDTO> LoginAsyc(LoginDTO loginDTO)
        {
            var user = await _userRepository.GetAllByFilterAsync(u => u.FullName.ToLower() == loginDTO.FullName.ToLower());

            if (user == null)
            {
                throw new Exception("invalid email or password");
            }

            if (!string.Equals(user.Email, loginDTO.Email, StringComparison.Ordinal))
                throw new Exception("Invalid email or password.");
            bool isPassValid = BCrypt.Net.BCrypt.Verify(loginDTO.Password, user.Password);

            if (!isPassValid)
            {
                throw new Exception("Invalid email or password.");
            }
            var token = _jwtService.GenerateToken(user.UserName, user.RoleId, user.Id);

            return new LoginResDTO
            {
                token = token,
                roleId = user.RoleId,
                FullName = user.FullName
            };

            //throw new NotImplementedException();
        }
    }
}
