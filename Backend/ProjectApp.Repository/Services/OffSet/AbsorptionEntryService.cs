using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Account.OffSet;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.OffSet;
using System.Data;

namespace ProjectApp.Repository.Services.OffSet
{
    public class AbsorptionEntryService : IAbsorptionEntry
    {
        private readonly CBContext _context;

        public AbsorptionEntryService(CBContext context)
        {
            _context = context;
        }

        // ================= INSERT =================
        public async Task<ServiceResponse<AbsorptionEntryDTO>> InsertAsync(AbsorptionEntryInsertDTO request)
        {
            try
            {
                using var conn = _context.Database.GetDbConnection();
                await conn.OpenAsync();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "USP_CB_EntryOffsetSearch";
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.Add(new SqlParameter("@Mode", "INSERT"));
                cmd.Parameters.Add(new SqlParameter("@ProjectId", request.ProjectId));
                cmd.Parameters.Add(new SqlParameter("@TreeId", request.TreeId));
                cmd.Parameters.Add(new SqlParameter("@TreeCount", request.TreeCount));
                cmd.Parameters.Add(new SqlParameter("@IsActive", request.IsActive));
                cmd.Parameters.Add(new SqlParameter("@EntryBy", request.EntryBy ?? (object)DBNull.Value));

                var messageParam = new SqlParameter("@Message", SqlDbType.NVarChar, 255)
                {
                    Direction = ParameterDirection.Output
                };
                cmd.Parameters.Add(messageParam);

                AbsorptionEntryDTO result = null;

                using var reader = await cmd.ExecuteReaderAsync();

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
                        IsActive = Convert.ToBoolean(reader["IsActive"])
                    };
                }

                if (result == null)
                    throw new Exception(messageParam.Value?.ToString() ?? "Insert failed");

                return new ServiceResponse<AbsorptionEntryDTO>
                {
                    Success = true,
                    Message = "Inserted successfully",
                    Data = result
                };
            }
            catch (Exception ex)
            {
                return new ServiceResponse<AbsorptionEntryDTO>
                {
                    Success = false,
                    Message = ex.Message
                };
            }
        }

        // ================= SEARCH =================
        public async Task<object> SearchAsync(
            int? projectId,
            string financialYear,
            int pageNumber,
            int pageSize,
            string search,
            string sortColumn,
            string sortDirection)
        {
            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_EntryOffsetSearch";
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(new SqlParameter("@Mode", "SEARCH"));
            cmd.Parameters.Add(new SqlParameter("@ProjectId", projectId ?? (object)DBNull.Value));
            cmd.Parameters.Add(new SqlParameter("@FinancialYear", financialYear ?? (object)DBNull.Value));
            cmd.Parameters.Add(new SqlParameter("@PageNumber", pageNumber));
            cmd.Parameters.Add(new SqlParameter("@PageSize", pageSize));
            cmd.Parameters.Add(new SqlParameter("@Search", search ?? (object)DBNull.Value));
            cmd.Parameters.Add(new SqlParameter("@SortColumn", sortColumn));
            cmd.Parameters.Add(new SqlParameter("@SortDirection", sortDirection));

            int totalRecords = 0;
            var data = new List<object>();
            object summary = null;

            using var reader = await cmd.ExecuteReaderAsync();

            // 1️⃣ Total Records
            if (await reader.ReadAsync())
                totalRecords = Convert.ToInt32(reader["TotalRecords"]);

            // 2️⃣ Data
            await reader.NextResultAsync();
            while (await reader.ReadAsync())
            {
                data.Add(new
                {
                    EntryId = reader["EntryId"],
                    ProjectId = reader["ProjectId"],
                    TreeId = reader["TreeId"],
                    TreeName = reader["TreeName"],
                    Co2AbsorptionPerYear = reader["Co2AbsorptionPerYear"],
                    TreeCount = reader["TreeCount"],
                    Co2Total = reader["Co2Total"],
                    IsActive = reader["IsActive"]
                });
            }

            // 3️⃣ Summary
            await reader.NextResultAsync();
            if (await reader.ReadAsync())
            {
                summary = new
                {
                    PreviousYearEmission = reader["PreviousYearEmission"],
                    TotalOffset = reader["TotalOffset"],
                    RemainingEmission = reader["RemainingEmission"],
                    Status = reader["Status"]
                };
            }

            return new
            {
                totalRecords,
                data,
                summary
            };
        }
    }
}