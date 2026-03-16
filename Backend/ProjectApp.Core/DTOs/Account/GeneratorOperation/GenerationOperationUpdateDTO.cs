using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.GeneratorOperation
{
    public class GenerationOperationUpdateDTO
    {
        public string GeneratorId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public decimal LoadFactor { get; set; }
        public decimal FuelConsumedLiters { get; set; }
        public string SiteId { get; set; }
    }
}
