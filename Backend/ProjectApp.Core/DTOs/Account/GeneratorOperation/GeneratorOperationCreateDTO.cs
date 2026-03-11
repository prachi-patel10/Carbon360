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

        //public DateTime OperationDate { get; set; }

        public DateTime StartTime { get; set; }

        public DateTime EndTime { get; set; }

        public decimal LoadFactor { get; set; }

        public decimal FuelConsumedLiters { get; set; }
        public string SiteId { get; set; }


        public int? StatusId { get; set; }
    }
}

