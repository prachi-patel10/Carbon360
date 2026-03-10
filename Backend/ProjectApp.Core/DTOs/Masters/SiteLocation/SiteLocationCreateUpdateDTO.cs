using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.SiteLocation
{
    public class SiteLocationCreateUpdateDTO
    {
        public string SiteName { get; set; }
        public string BuildingName { get; set; }
        public string City { get; set; }
        public string State { get; set; }
        public string DepartmentId { get; set; }

        [Required]
        [StringLength(3, MinimumLength = 2, ErrorMessage = "ShortCode must be 2-3 characters.")]
        public string ShortCode { get; set; }

    }
}
