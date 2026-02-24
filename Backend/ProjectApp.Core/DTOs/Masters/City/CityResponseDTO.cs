using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.City
{
    public class CityResponseDTO
    {
        public string CityId { get; set; }   // Encrypted Id
        public string CityName { get; set; }
        public string StateName { get; set; }
        public string Pincode { get; set; }
        public bool IsActive { get; set; }
        public int? EntryBy { get; set; }
        public int? UpdateBy { get; set; }
        public DateTime EntryDate { get; set; }
        public DateTime? UpdateDate { get; set; }

    }
}
