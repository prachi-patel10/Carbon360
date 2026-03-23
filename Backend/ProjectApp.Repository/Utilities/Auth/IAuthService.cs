using ProjectApp.Core.DTOs.Account.ForgotPassword;
using ProjectApp.Core.DTOs.Account.Login;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Utilities.Auth
{
    public interface IAuthService
    {
        Task<LoginResDTO> LoginAsyc(LoginDTO loginDTO);
        Task LogoutAsync(int userId);
        Task<LoginResDTO> SwitchRoleAsync(SwitchRoleDTO dto);
        Task<ForgotPasswordResDTO> ForgotPasswordAsync(ForgotPasswordDTO dto);
        Task<ForgotPasswordResDTO> ResetPasswordAsync(ResetPasswordDTO dto);

    }
}
