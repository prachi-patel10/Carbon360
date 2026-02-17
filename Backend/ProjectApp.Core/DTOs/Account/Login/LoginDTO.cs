using System.ComponentModel.DataAnnotations;

namespace ProjectApp.Core.DTOs.Account.Login
{
    public class LoginDTO
    {
        //[Required]
        //public string Policy { get; set; }
        [Required]
        public string Email { get; set; }
        [Required]
        public string Password { get; set; }

    }
}
