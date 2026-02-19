using System.ComponentModel.DataAnnotations;

namespace ProjectApp.Core.DTOs.Account.User
{
    public class UserDTO
    {
        [Required]
        [MinLength(3)]
        [MaxLength(50)]
        public string FullName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MinLength(4)]
        public string Password { get; set; }

        [Required]
        [Compare("Password", ErrorMessage = "Password and Confirm Password must match")]
        public string ConfirmPassword { get; set; }

        public int? DepartmentId { get; set; }

        [Required]
        public bool IsActive { get; set; }

        // For role dropdown selection
        [Required]
        public List<int> RoleId { get; set; }
    }
}
