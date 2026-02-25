using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.EmissionFactor
{
        public class EmissionFactorRequestDTO
        {
            public string FuelType { get; set; }
            public decimal CO2_Factor_KgPerL { get; set; }
            public decimal NO2_Factor_KgPerKm { get; set; }
            public decimal CH4_Factor_KgPerKm { get; set; }
        }

        public class EmissionFactorResponseDTO
        {
            public string Id { get; set; }  // Encrypted
            public string FuelType { get; set; }
            public decimal CO2_Factor_KgPerL { get; set; }
            public decimal NO2_Factor_KgPerKm { get; set; }
            public decimal CH4_Factor_KgPerKm { get; set; }
            public bool? IsActive { get; set; }
        }

        public class ApiResponse<T>
        {
            public bool Status { get; set; }
            public int StatusCode { get; set; }
            public string Message { get; set; }
            public T Data { get; set; }
        }
    
}
