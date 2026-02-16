using System.ComponentModel.DataAnnotations;

namespace ProjectApp.Core.DTOs.Account.Login
{
    public class LoginDTO
    {
        //[Required]
        //public string Policy { get; set; }
        [Required]
        public string UserName { get; set; }
        [Required]
        public string Password { get; set; }
    }
}
