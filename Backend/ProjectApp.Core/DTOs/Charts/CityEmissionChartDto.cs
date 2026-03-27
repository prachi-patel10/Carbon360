using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class CityEmissionChartDto
    {
        public string CityName { get; set; }
        public decimal CO2 { get; set; }
        public decimal NO2 { get; set; }
        public decimal CH4 { get; set; }
    }
}
