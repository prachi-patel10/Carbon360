using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.GeneratorOperation
{
    public class GeneratorOperationSearchDTO
    {
        public string? Search { get; set; }

        public string? GeneratorName { get; set; }

        public string? FuelType { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public int? StatusId { get; set; }

        public int PageNumber { get; set; } = 1;

        public int PageSize { get; set; } = 10;
    }
}

