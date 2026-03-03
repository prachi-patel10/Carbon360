using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Generator
{
    public class GeneratorCreateUpdateDTO
    {
        public string? GeneratorId { get; set; }  // encoded ID for update
        public string GeneratorName { get; set; }
        // Foreign keys as strings (encoded)
        public string FuelId { get; set; }
        public string SiteId { get; set; }
        public string DepartmentId { get; set; }

        public decimal RatedCapacityKW { get; set; }
    }
}
