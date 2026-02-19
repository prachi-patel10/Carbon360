using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Account.Login;
using ProjectApp.Repository.Utilities.Auth;
using System.Security.Claims;

namespace ProjectApp.API.Controllers.Account.Login
{
    [Route("api/")]
    [ApiController]
    public class LoginController : ControllerBase
    {
        private readonly IAuthService _authService;
        public LoginController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("Login")]
        public async Task<ActionResult<string>> Login([FromBody] LoginDTO logindto)
        {
            var res = await _authService
                 .LoginAsyc(logindto);

            return Ok(new
            {
                success = true,
                message = "Login successful",
                data = res
            });
        }

        //[Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "UserId");

            if (userIdClaim == null)
                return Unauthorized("Invalid token");

            int userId = Convert.ToInt32(userIdClaim.Value);

            await _authService.LogoutAsync(userId);

            return Ok(new
            {
                success = true,
                message = "Logged out successfully"
            });
        }

        [HttpPost]
        [Route("SwitchRole")]
        public async Task<ActionResult<LoginResDTO>> SwitchRole([FromBody] SwitchRoleDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest("Invalid request");

            var result = await _authService.SwitchRoleAsync(dto);

            return Ok(result); // returns FullName, RoleName, and refreshed token
        }

    }
}
