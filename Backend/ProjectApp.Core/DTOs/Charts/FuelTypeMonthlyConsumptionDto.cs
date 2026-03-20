using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class FuelTypeMonthlyConsumptionDto
    {
        public string FuelType { get; set; }
        public string Source { get; set; }  // ✅ "Vehicle" or "Generator"
        public int MonthNumber { get; set; }
        public string MonthName { get; set; }
        public decimal TotalFuelConsumed { get; set; }
    }
}
