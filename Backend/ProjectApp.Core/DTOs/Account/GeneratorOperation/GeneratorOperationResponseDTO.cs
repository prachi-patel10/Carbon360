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
        public string GeneratorId { get; set; }

        public string? SiteId { get; set; }
        public string? SiteName { get; set; }
        public DateOnly OperationDate { get; set; }
        public DateTime StartTime { get; set; }      
        public DateTime EndTime { get; set; }
        public decimal RunHours { get; set; }
        public decimal LoadFactor { get; set; }
        public decimal PowerOutputKWH { get; set; }
        public decimal FuelConsumedLiters { get; set; }

        public decimal TotalCO2 { get; set; }
        public decimal TotalNO2 { get; set; }
        public decimal TotalCH4 { get; set; }

        public decimal TotalEmission { get; set; }

        public decimal GWP_CH4 { get; set; } = 28; 
        public decimal GWP_NO2 { get; set; } = 265;

        public decimal? CO2 { get; set; }
        public decimal? NO2 { get; set; }
        public decimal? CH4 { get; set; }
        public int StatusId { get; set; }

        public int EntryBy { get; set; }
        public DateTime EntryDate { get; set; }

        public string GeneratorName { get; set; }   
        public string FuelType { get; set; }
    }
}

