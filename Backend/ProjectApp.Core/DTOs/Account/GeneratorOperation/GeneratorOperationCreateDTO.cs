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
    
        public int GeneratorId { get; set; }

        public DateOnly OperationDate { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public decimal LoadFactor { get; set; }

        public decimal FuelConsumedLiters { get; set; }
    }
}