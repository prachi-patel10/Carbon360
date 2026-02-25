using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Generator
{
    public class GeneratorCreateUpdateDTO
    {
        public string GeneratorName { get; set; }
        public int FuelId { get; set; }
        public decimal RatedCapacityKW { get; set; }
        public int SiteId { get; set; }
        public int DepartmentId { get; set; }
    }
}
