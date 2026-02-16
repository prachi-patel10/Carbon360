using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace ProjectApp.Core.DTOs.Masters.Section
{
    public class SectionDTO
    {
        [Required]
        public int id { get; set; }
        [Required]
        public string SectionName { get; set; }
        [Required]
        public string ShortCode { get; set; }

        [Required]
        public int DepartmentId { get; set; }
        [Required]
        public bool IsActive { get; set; }
    }
}
