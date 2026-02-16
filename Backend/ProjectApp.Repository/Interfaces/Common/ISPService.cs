using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;

namespace ProjectApp.Repository.Interfaces.Common
{
    public interface ISPService
    {
        Task<Dictionary<string, object>> ExecuteSpAsync(string spName, params SqlParameter[] parameters);
    }
}
