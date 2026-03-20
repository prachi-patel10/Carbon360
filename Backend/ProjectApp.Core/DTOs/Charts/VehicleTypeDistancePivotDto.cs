using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class VehicleTypeDistancePivotDto
    {
        public List<string> MonthLabels { get; set; }
        public List<string> VehicleTypes { get; set; }
        public List<string> Colors { get; set; }
        public List<List<decimal>> DistanceMatrix { get; set; }
        public List<List<int>> TripsMatrix { get; set; }
        public List<List<decimal>> FuelMatrix { get; set; }
        public List<decimal> MonthTotals { get; set; }
        public List<decimal> TypeTotals { get; set; }
        public decimal GrandTotal { get; set; }
    }
}
