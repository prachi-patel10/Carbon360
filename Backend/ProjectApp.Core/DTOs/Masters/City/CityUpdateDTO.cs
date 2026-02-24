using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.City
{
    public class CityUpdateDTO
    {
        public string CityId { get; set; }   // Encrypted Id
        public string CityName { get; set; }
        public string StateName { get; set; }
        public string Pincode { get; set; }

    }
}
