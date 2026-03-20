using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class GeneratorRunHoursRawDto
    {
        public string GeneratorName { get; set; }
        public string SiteName { get; set; }
        public decimal TotalRunHours { get; set; }
        public decimal TotalFuelConsumed { get; set; }
        public decimal TotalPowerOutputKWH { get; set; }
    }
}
