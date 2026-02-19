using System.ComponentModel.DataAnnotations;

namespace ProjectApp.Core.DTOs.Account.User
{
    public class UserResDTO
    {
        public string UserId { get; set; }
        public string FName { get; set; }
        public string LName { get; set; }
        public string UserName { get; set; }

        public string Email { get; set; }
        public int? DepartmentId { get; set; }
        public bool? IsActive { get; set; }
        public DateTime? EntryDate { get; set; }
        public List<string> Roles { get; set; } = new();
    }
}
