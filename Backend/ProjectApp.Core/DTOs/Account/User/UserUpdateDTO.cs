using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.User
{
    public class UserUpdateDTO
    {
        [Required]
        public string UserId { get; set; }

        [Required]
        public string FullName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        public int? DepartmentId { get; set; }

        public bool IsActive { get; set; }

        public string? Password { get; set; }
    }
}
