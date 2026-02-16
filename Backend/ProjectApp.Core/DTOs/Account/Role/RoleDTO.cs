using System.ComponentModel.DataAnnotations;

namespace ProjectApp.Core.DTOs.Account.Role
{
    public class RoleDTO
    {
        [Required]
        public int Id { get; set; }
        [Required]
        public string RoleName { get; set; }
        [Required]
        public string RoleDescription { get; set; }
        [Required]
        public bool IsActive { get; set; }

    }
}

