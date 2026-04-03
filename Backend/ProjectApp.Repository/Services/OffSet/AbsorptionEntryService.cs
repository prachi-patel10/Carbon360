using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using ProjectApp.Core.DTOs.Account.OffSet;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.OffSet;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;


namespace ProjectApp.Repository.Services.OffSet
{
    public class AbsorptionEntryService : IAbsorptionEntry
    {
        private readonly CBContext _context;

        public AbsorptionEntryService(CBContext context)
        {
            _context = context;
        }

        private async Task<ServiceResponse<T>> ExecuteAsync<T>(Func<Task<T>> func, string successMessage)
        {
            try
            {
                var result = await func();

                return new ServiceResponse<T>
                {
                    Success = true,
                    Message = successMessage,
                    Data = result
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<T>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = default
                };
            }
        }

        public async Task<ServiceResponse<AbsorptionEntryDTO>> InsertAsync(AbsorptionEntryInsertDTO request)
        {
            return await ExecuteAsync(async () =>
            {
                using (var conn = _context.Database.GetDbConnection())
                {
                    await conn.OpenAsync();

                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "USP_CB_EntryOffsetSearch";
                        cmd.CommandType = CommandType.StoredProcedure;

                        // 🔹 INPUT PARAMETERS
                        cmd.Parameters.Add(new SqlParameter("@Mode", "INSERT"));
                        cmd.Parameters.Add(new SqlParameter("@ProjectId", request.ProjectId));
                        cmd.Parameters.Add(new SqlParameter("@TreeId", request.TreeId));
                        cmd.Parameters.Add(new SqlParameter("@TreeCount", request.TreeCount));
                        cmd.Parameters.Add(new SqlParameter("@IsActive", request.IsActive));
                        cmd.Parameters.Add(new SqlParameter("@EntryBy", request.EntryBy ?? (object)DBNull.Value));

                        // 🔹 OUTPUT PARAMETERS
                        var newIdParam = new SqlParameter("@NewEntryId", SqlDbType.Int)
                        {
                            Direction = ParameterDirection.Output
                        };
                        cmd.Parameters.Add(newIdParam);

                        var messageParam = new SqlParameter("@Message", SqlDbType.NVarChar, 255)
                        {
                            Direction = ParameterDirection.Output
                        };
                        cmd.Parameters.Add(messageParam);

                        AbsorptionEntryDTO result = null;

                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            // SP returns inserted row
                            if (await reader.ReadAsync())
                            {
                                result = new AbsorptionEntryDTO
                                {
                                    EntryId = Convert.ToInt32(reader["EntryId"]),
                                    ProjectId = Convert.ToInt32(reader["ProjectId"]),
                                    TreeId = Convert.ToInt32(reader["TreeId"]),
                                    TreeName = reader["TreeName"].ToString(),
                                    Co2AbsorptionPerYear = Convert.ToDecimal(reader["Co2AbsorptionPerYear"]),
                                    TreeCount = Convert.ToInt32(reader["TreeCount"]),
                                    Co2Total = Convert.ToDecimal(reader["Co2Total"]),
                                    IsActive = Convert.ToBoolean(reader["IsActive"]),
                                    EntryBy = reader["EntryBy"] as int?,
                                    EntryDate = reader["EntryDate"] as DateTime?
                                };
                            }
                        }

                        // Optional: you can read output message
                        var spMessage = messageParam.Value?.ToString();

                        if (result == null)
                            throw new Exception(spMessage ?? "Insert failed");

                        return result;
                    }
                }

            }, "Entry inserted successfully");
        }

        

      
        

    }
}
