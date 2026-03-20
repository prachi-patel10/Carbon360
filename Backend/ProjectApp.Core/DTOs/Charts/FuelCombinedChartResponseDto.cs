using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class FuelCombinedChartResponseDto
    {
        public List<string> Labels { get; set; } = new(); // months on X-axis
        public List<FuelStackDataset> Datasets { get; set; } = new(); // one per fuel+source
    }

    public class FuelStackDataset
    {
        public string Label { get; set; }  
        public string FuelType { get; set; }  
        public string Source { get; set; } 
        public List<decimal> Data { get; set; } = new();
        public string Color { get; set; }  
    }
}
