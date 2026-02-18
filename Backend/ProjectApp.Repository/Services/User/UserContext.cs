using Microsoft.AspNetCore.Http;
using ProjectApp.Repository.Interfaces.User;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.User
{
    public class UserContext : IUserContext
    {
        private readonly IHttpContextAccessor _http;
        public UserContext(IHttpContextAccessor http)
        {
            _http = http;
        }
        public int UserId =>
            int.Parse(_http.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier));

        public string Role =>
            _http.HttpContext.User.FindFirstValue(ClaimTypes.Role);

    }
}
