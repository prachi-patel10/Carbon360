using System.ComponentModel.DataAnnotations;

namespace ProjectApp.Core.DTOs.Account.User
{
    public class UserDTO
    {
        [Required(ErrorMessage = "Id is required")]
        public int Id { get; set; }


        [Required(ErrorMessage = "Username is required")]
        [MinLength(3, ErrorMessage = "Username must be at least 3 characters")]
        [MaxLength(50, ErrorMessage = "Username cannot exceed 50 characters")]
        public string UserName { get; set; }


        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        [RegularExpression(
            @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
            ErrorMessage = "Please enter a valid email address"
        )]
        public string Email { get; set; }


        [Required(ErrorMessage = "Password is required")]
        [MinLength(4, ErrorMessage = "Password must be at least 4 characters long")]
        public string Password { get; set; }


        [Required(ErrorMessage = "Date of birth is required")]
        public DateOnly DateOfBirth { get; set; }


        [Required(ErrorMessage = "Gender is required")]
        [RegularExpression("^(Male|Female|Other)$",
            ErrorMessage = "Gender must be Male, Female, or Other")]
        public string Gender { get; set; }


        [Required(ErrorMessage = "Phone number is required")]
        public string PhoneNumber { get; set; }


        [Required(ErrorMessage = "Blood group is required")]
        [RegularExpression("^(A\\+|A-|B\\+|B-|AB\\+|AB-|O\\+|O-)$",
            ErrorMessage = "Invalid blood group")]
        public string BloodGroup { get; set; }


        [Required(ErrorMessage = "Role is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Invalid RoleId")]
        public int RoleId { get; set; }


        [Required]
        public bool IsActive { get; set; }
    }
}
