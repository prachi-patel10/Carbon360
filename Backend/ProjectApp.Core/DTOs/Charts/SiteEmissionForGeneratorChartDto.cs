using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class SiteEmissionForGeneratorChartDto
    {
        public string SiteName { get; set; }
        public decimal CO2e { get; set; }
        public decimal CO2 { get; set; }
        public decimal NO2 { get; set; }
        public decimal CH4 { get; set; }
    }
}
