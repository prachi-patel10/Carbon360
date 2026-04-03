using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.OffSet
{
    public class AbsorptionEntryDTO
    {
        public int EntryId { get; set; }
        public int ProjectId { get; set; }
        public int TreeId { get; set; }
        public string TreeName { get; set; }
        public decimal Co2AbsorptionPerYear { get; set; }
        public int TreeCount { get; set; }
        public decimal Co2Total { get; set; }
        public bool? IsActive { get; set; }
        public int? EntryBy { get; set; }
        public DateTime? EntryDate { get; set; }
    }
}
