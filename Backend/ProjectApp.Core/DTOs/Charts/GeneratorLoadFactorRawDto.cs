using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class GeneratorLoadFactorRawDto
    {
        public string GeneratorName { get; set; }
        public int MonthNumber { get; set; }
        public string MonthName { get; set; }
        public decimal AvgLoadFactor { get; set; }
        public decimal MaxLoadFactor { get; set; }
        public decimal MinLoadFactor { get; set; }
        public int OperationCount { get; set; }
    }
}
