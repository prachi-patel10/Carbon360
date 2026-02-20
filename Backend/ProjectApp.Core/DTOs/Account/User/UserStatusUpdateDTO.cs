using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Core.DTOs.Account.User
{
    public class UserStatusUpdateDTO
    {
        public string UserId { get; set; } // encrypted id
        public bool IsActive { get; set; }
    }
}
