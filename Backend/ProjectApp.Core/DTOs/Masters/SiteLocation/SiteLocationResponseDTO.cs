using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.SiteLocation
{
    public class SiteLocationResponseDTO
    {
        public int Id { get; set; }           // 🔹 Add this (numeric DB id)

        public string SiteId { get; set; } 
        public string SiteName { get; set; }
        public string BuildingName { get; set; }
        public string City { get; set; }
        public string State { get; set; }
        public string ShortCode { get; set; }
        public bool IsActive { get; set; }
    }
}
