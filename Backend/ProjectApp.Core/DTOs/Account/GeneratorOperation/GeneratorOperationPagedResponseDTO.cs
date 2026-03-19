using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.GeneratorOperation
{
    public class GeneratorOperationPagedResponseDTO
    {
        // List of generator operations
        public List<GeneratorOperationResponseDTO> Records { get; set; } = new List<GeneratorOperationResponseDTO>();

        // Total number of records for pagination
        public int TotalRecords { get; set; } = 0;
    }
}

