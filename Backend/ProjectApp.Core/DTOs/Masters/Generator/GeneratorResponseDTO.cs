using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Generator
{
    public class GeneratorResponseDTO
    {
        public string GeneratorId { get; set; }   // Encrypted
        public string GeneratorName { get; set; }
        public string FuelName { get; set; }
        public decimal RatedCapacityKW { get; set; }
        public string SiteName { get; set; }
        public string DepartmentName { get; set; }
        public bool IsActive { get; set; }
    }
}
