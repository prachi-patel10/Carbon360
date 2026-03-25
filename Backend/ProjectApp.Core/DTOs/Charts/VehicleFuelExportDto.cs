using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class VehicleFuelExportDto
    {
        public string Month { get; set; }

        // dynamic fuels (you can expand if needed)
        public decimal Diesel { get; set; }
        public decimal Petrol { get; set; }
        public decimal CNG { get; set; }
        public decimal LPG { get; set; }
    }
}
