using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Common
{
    public class WorkflowActionDTO
    {
        public int WorkflowId { get; set; }
        public int CurrentStatusId { get; set; }
        public int NextStatusId { get; set; }
        public string ActionName { get; set; }
        public string RoleName { get; set; }
    }
}
