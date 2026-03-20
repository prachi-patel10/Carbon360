using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class GeneratorLoadFactorChartResponseDto
    {
        public List<string> Labels { get; set; }   // Jan–Dec
        public List<LoadFactorLineDataset> Datasets { get; set; }
    }
}
