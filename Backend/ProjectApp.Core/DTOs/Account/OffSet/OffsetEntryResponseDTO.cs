using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.OffSet
{
    public class OffsetEntryResponseDTO
    {
        public int OffsetEntryId { get; set; }
        public decimal PreviousYearEmission { get; set; }
        public decimal TotalOffset { get; set; }
       
    }
}
