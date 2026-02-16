using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Azure.Core;
using Microsoft.Data.SqlClient;

namespace ProjectApp.Repository.Utilities.SP
{
    public class SpParameterBuilder
    {
        public static List<SqlParameter> BuildSearchParams(SearchRequest request)
        {
            return new List<SqlParameter>
            {
                new SqlParameter("@Search", request.Search ?? (object)DBNull.Value),
            new SqlParameter("@IsActive", request.IsActive ?? (object)DBNull.Value),

            new SqlParameter("@PageNumber", request.PageNumber),
            new SqlParameter("@PageSize", request.PageSize),

            new SqlParameter("@SortColumn", request.SortColumn ),
            new SqlParameter("@SortDirection", request.SortDirection)
            };
            
        }
    }
}
