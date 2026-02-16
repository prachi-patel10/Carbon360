using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ProjectApp.Core.DTOs.Account.Login;
using ProjectApp.Repository.Utilities.Auth;

namespace ProjectApp.API.Controllers.Account.Login
{
    [Route("api/[controller]")]
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

            return Ok(res);
        }
    }
}
