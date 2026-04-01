using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class VehicleCategoryChartResponseDto
    {
        public List<string> Labels { get; set; }           // CategoryName  — x-axis
        public List<decimal> DistanceData { get; set; }    // TotalDistanceKm — bar series 1
        public List<decimal> EmissionData { get; set; }    // TotalEmission   — bar series 2
        public List<string> Colors { get; set; }           // per-category color
    }
}
