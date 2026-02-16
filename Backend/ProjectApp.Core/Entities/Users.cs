namespace ProjectApp.Core.Entities
{ 
    public class Users
    {
        public int Id { get; set; }
        public string UserName { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public DateOnly DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string PhoneNumber { get; set; }
        public string BloodGroup { get; set; }
        public int RoleId { get; set; }

        public bool IsActive { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Roles Role { get; set; }

        //public ICollection<Section> Sections { get; set; }
        public ICollection<Workers> Worker { get; set; }
    }
}
