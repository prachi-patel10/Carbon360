using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Charts
{
    public class VehicleDistanceChartResponseDto
    {
        public List<string> Labels { get; set; }   // Month names
        public List<decimal> DistanceData { get; set; }   // KM per month
        public List<int> TripData { get; set; }   // Trip count per month
        public List<decimal> FuelData { get; set; }   // Fuel consumed per month
    }
}
