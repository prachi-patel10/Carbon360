using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class VehicleTypeDistanceRawDto
    {
        public int YearNumber { get; set; }
        public int MonthNumber { get; set; }
        public string MonthName { get; set; }
        public string VehicleTypeName { get; set; }
        public decimal TotalDistanceKM { get; set; }
        public int TotalTrips { get; set; }
        public decimal TotalFuelConsumed { get; set; }
    }
}
