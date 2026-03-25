using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class VehicleSummaryDto
    {
        public decimal TotalCO2e { get; set; }
        public decimal TotalCO2 { get; set; }
        public decimal TotalCH4 { get; set; }
        public decimal TotalNO2 { get; set; }
        public decimal TotalFuelConsumed { get; set; }
        public decimal TotalDistanceKM { get; set; }
    }
}
