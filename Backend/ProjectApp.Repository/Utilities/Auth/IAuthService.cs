using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ProjectApp.Core.DTOs.Account.Login;

namespace ProjectApp.Repository.Utilities.Auth
{
    public interface IAuthService
    {
        Task<LoginResDTO> LoginAsyc(LoginDTO loginDTO);
    }
}
