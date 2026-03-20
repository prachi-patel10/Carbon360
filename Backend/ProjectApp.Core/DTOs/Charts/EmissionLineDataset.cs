using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class EmissionLineDataset
    {
        public string Label { get; set; }        // "CO2 (kg)", "NO2 (kg)", etc.
        public string EmissionType { get; set; } // "CO2" | "NO2" | "CH4" | "Total"
        public string Color { get; set; }
        public List<decimal> Data { get; set; }  // 12 values Jan–Dec
    }
}
