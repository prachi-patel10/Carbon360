using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class GeneratorRunHoursChartResponseDto
    {
        public List<string> Labels { get; set; }   // Generator names
        public List<decimal> Data { get; set; }   // Run hours per generator
        public List<string> Colors { get; set; }   // Slice colors
        public List<string> SiteNames { get; set; }   // Tooltip: site name
        public List<decimal> FuelConsumed { get; set; }   // Tooltip: fuel consumed
        public List<decimal> PowerOutput { get; set; }   // Tooltip: power output
    }
}
