using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class VehicleCategoryEmissionRawDto
    {
        public string CategoryName { get; set; }
        public decimal TotalDistanceKm { get; set; }
        public decimal TotalCO2 { get; set; }
        public decimal TotalNO2 { get; set; }
        public decimal TotalCH4 { get; set; }
        public decimal TotalEmission { get; set; }
        public int TripCount { get; set; }
    }
}
