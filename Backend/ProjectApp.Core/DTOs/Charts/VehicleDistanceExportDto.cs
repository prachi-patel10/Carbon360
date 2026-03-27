using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class VehicleDistanceExportDto
    {
        public string Month { get; set; } = "";
        public double DistanceKM { get; set; }
        public int TripCount { get; set; }
        public double FuelConsumed { get; set; }
    }
}
