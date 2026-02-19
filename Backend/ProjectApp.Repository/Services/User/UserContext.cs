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
        //public int UserId =>
        //    int.Parse(_http.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier));

        //public string Role =>
        //    _http.HttpContext.User.FindFirstValue(ClaimTypes.Role);

        //    public string Role =>
        //_http.HttpContext?.User?.FindFirstValue(ClaimTypes.Role) ?? "";

        public int UserId
        {
            get
            {
                var user = _http.HttpContext?.User;

                if (user == null || !user.Identity.IsAuthenticated)
                    throw new Exception("User is not authenticated");

                var claim = user.FindFirst(ClaimTypes.NameIdentifier);

                if (claim == null)
                    throw new Exception("UserId claim not found in token");

                return int.Parse(claim.Value);
            }
        }


        public string Role
        {
            get
            {
                var user = _http.HttpContext?.User;

                if (user == null || !user.Identity.IsAuthenticated)
                    throw new Exception("User is not authenticated");

                return user.FindFirst(ClaimTypes.Role)?.Value;
            }
        }



    }
}
