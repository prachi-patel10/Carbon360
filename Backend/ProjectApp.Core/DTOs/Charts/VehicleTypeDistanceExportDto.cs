using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class VehicleTypeDistanceExportDto
    {
        public string VehicleType { get; set; } = "";
        public double TotalDistanceKM { get; set; }
    }
}
