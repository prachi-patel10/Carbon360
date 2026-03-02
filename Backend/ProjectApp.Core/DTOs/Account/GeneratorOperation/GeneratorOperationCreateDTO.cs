using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.GeneratorOperation
{
    public class GeneratorOperationCreateDTO
    {
        public string GeneratorId { get; set; }

        public DateTime OperationDate { get; set; }

        public TimeSpan StartTime { get; set; }
            
        public TimeSpan EndTime { get; set; }

        public decimal LoadFactor { get; set; }

        public decimal FuelConsumedLiters { get; set; }
    }
}