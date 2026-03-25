using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class VehicleEmissionExportDto
    {
        public string Month { get; set; }
        public double TotalCO2e { get; set; }
        public double TotalCO2 { get; set; }
        public double TotalNO2 { get; set; }
        public double TotalCH4 { get; set; }
    }
}
