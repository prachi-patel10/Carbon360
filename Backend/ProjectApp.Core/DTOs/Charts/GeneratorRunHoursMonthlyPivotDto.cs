using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class GeneratorRunHoursMonthlyPivotDto
    {
        public List<string> MonthLabels { get; set; }
        public List<string> GeneratorNames { get; set; }
        public List<string> Colors { get; set; }
        public List<List<decimal>> RunHoursMatrix { get; set; }   // [monthIdx][genIdx]
        public List<List<decimal>> FuelMatrix { get; set; }
        public List<List<decimal>> PowerMatrix { get; set; }
        public List<decimal> MonthTotals { get; set; }
        public List<decimal> GeneratorTotals { get; set; }
        public decimal GrandTotal { get; set; }
    }
}
