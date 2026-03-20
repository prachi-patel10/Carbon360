using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class LoadFactorLineDataset
    {
        public string GeneratorName { get; set; }
        public string Color { get; set; }
        public List<decimal> AvgData { get; set; }  // 12 months
        public List<decimal> MaxData { get; set; }
        public List<decimal> MinData { get; set; }
        public List<int> OpCountData { get; set; }
    }
}
