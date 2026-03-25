using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class GeneratorRunHoursMonthlyRawDto
    {
        public string GeneratorName { get; set; }
        public int MonthNumber { get; set; }
        public decimal TotalRunHours { get; set; }
        public decimal TotalFuelConsumed { get; set; }
        public decimal TotalPowerOutputKWH { get; set; }
        public int OperationCount { get; set; }
    }
}
