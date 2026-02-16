using System.ComponentModel.DataAnnotations;

namespace ProjectApp.Core.DTOs.Worker
{
    public class WorkerDTO
    {
        [Required]
        public int id { get; set; }
        [Required]
        public string FullName { get; set; }
        [Required]
        public int Age { get; set; }
        [Required]
        public string Gender { get; set; }
        [Required]
        public string PhoneNumber { get; set; }
        [Required]
        public string EmpType { get; set; }
        [Required]
        public string Department { get; set; }
        [Required]
        public int UserId { get; set; }

    }
}
