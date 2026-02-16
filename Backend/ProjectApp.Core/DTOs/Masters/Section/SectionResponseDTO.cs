using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Section
{
    public class SectionResponseDTO
    {
        public string Id { get; set; }
        public string SectionName { get; set; }
        public string ShortCode { get; set; }
        public string DepartmentName { get; set; }
        public bool IsActive { get; set; }
    }
}
