
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Masters.Department
{
    public class DepartmentDTO
    {
        [Required]
        public int Id { get; set; }
        [Required]
        public string DepartmentName
        {
            get; set;
        }
    }
}
