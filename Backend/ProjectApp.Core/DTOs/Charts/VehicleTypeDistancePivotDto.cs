using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class VehicleTypeDistancePivotDto
    {
        public List<string>         MonthLabels    { get; set; }  // 12 month names
        public List<string>         VehicleTypes   { get; set; }  // column headers
        public List<string>         Colors         { get; set; }  // one colour per vehicle type
        // [monthIndex][typeIndex] = distance km
        public List<List<decimal>>  DistanceMatrix { get; set; }
        public List<List<int>>      TripsMatrix    { get; set; }
        public List<List<decimal>>  FuelMatrix     { get; set; }
        // Row totals (sum across all types per month)
        public List<decimal>        MonthTotals    { get; set; }
        // Column totals (sum across all months per type)
        public List<decimal>        TypeTotals     { get; set; }
        // Grand total
        public decimal              GrandTotal     { get; set; }
    }
}
