using System.Diagnostics.SymbolStore;
using System.Security.Cryptography.X509Certificates;

namespace ProjectApp.Core.Entities
{
    public class Workers
    {
        public int id { get; set; }
        public string FullName { get; set; }
        public int Age { get; set; }
        public string Gender { get; set; }
        public string PhoneNumber { get; set; }
        public string EmpType { get; set; }
        public string Department { get; set; }

        public int UserId { get; set; }
        public Users User { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
