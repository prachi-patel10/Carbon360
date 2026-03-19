using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class FuelCombinedChartResponseDto
    {
        public List<string> Labels { get; set; } = new(); // months
        public List<FuelStackDataset> VehicleDatasets { get; set; } = new();
        public List<FuelStackDataset> GeneratorDatasets { get; set; } = new();
    }

    public class FuelStackDataset
    {
        public string FuelType { get; set; }
        public List<decimal> Data { get; set; } = new();
        public string Color { get; set; }
    }
}
