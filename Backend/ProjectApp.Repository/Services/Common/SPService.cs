using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using Azure;
using Microsoft.AspNetCore.Mvc.Razor;

//using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Data.SqlClient;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Utilities.SP;

namespace ProjectApp.Repository.Services.Common
{
    public class SPService : ISPService
    {
        private readonly string _conString;
        public SPService(string conString)
        {
            _conString = conString;
        }

       
        public async Task<Dictionary<string, object>> ExecuteSpAsync(string spName, params SqlParameter[] parameters)
        {
            Dictionary<string, object> response = new Dictionary<string, object>();
            Dictionary<string, object> pagination = new Dictionary<string, object>();
            List<Dictionary<string, object>> dataList = new List<Dictionary<string, object>>();

            using (SqlConnection connection = new SqlConnection(_conString))
            {
                await connection.OpenAsync();
                using (SqlCommand command = new SqlCommand(spName, connection))
                {
                    command.CommandType = System.Data.CommandType.StoredProcedure;
                    //adding parameters
                    if (parameters != null && parameters.Length > 0)
                    {
                        command.Parameters.AddRange(parameters.ToArray());
                    }


                    using (SqlDataReader reader = await command.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            Dictionary<string, object> row = new Dictionary<string, object>();
                            for (int i = 0; i < reader.FieldCount; i++)
                            {
                                row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                            }
                            dataList.Add(row);
                        }

                        if (await reader.NextResultAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                pagination["TotalRecords"] =
                                  Convert.ToInt32(reader["TotalRecords"]);

                                pagination["TotalPages"] =
                                    Convert.ToInt32(reader["TotalPages"]);

                                pagination["CurrentPage"] =
                                    Convert.ToInt32(reader["CurrentPage"]);
                            }
                        }
                    }

                }

                response["Data"] = dataList;
                response["Pagination"] = pagination;

                return response;
            }
        }
    }
}
