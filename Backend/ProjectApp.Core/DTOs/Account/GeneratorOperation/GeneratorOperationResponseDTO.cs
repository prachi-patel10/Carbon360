using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.GeneratorOperation
{
    public class GeneratorOperationResponseDTO
    {
        public string OperationId { get; set; }
        public int GeneratorId { get; set; }
        public DateOnly OperationDate { get; set; }
        public decimal RunHours { get; set; }
        public decimal LoadFactor { get; set; }
        public decimal PowerOutputKWH { get; set; }
        public decimal FuelConsumedLiters { get; set; }
        public int FuelId { get; set; }
        public int EntryBy { get; set; }
        public DateTime EntryDate { get; set; }
    }
}