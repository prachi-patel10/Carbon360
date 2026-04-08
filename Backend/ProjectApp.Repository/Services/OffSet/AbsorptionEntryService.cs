using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ProjectApp.Core.DTOs.Account.OffSet;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.OffSet;
using System.Data;

namespace ProjectApp.Repository.Services.OffSet
{
    public class AbsorptionEntryService : IAbsorptionEntry
    {
        private readonly CBContext _context;
        private readonly IConfiguration _config;

        public AbsorptionEntryService(CBContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

       
    

        // ================= GET BY ID =================
        public async Task<object> GetById(int offsetEntryId)
        {
            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_OffsetEntry_GetById";
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(new SqlParameter("@OffsetEntryId", offsetEntryId));

            object header = null;
            var details = new List<object>();

            using var reader = await cmd.ExecuteReaderAsync();

            // Header
            if (await reader.ReadAsync())
            {
                header = new
                {
                    OffsetEntryId = reader["OffsetEntryId"],
                    ProjectName = reader["ProjectName"],
                    FinancialYear = reader["FinancialYear"],
                    TotalOffset = reader["TotalOffset"] 
                };
            }

            // Details
            await reader.NextResultAsync();
            while (await reader.ReadAsync())
            {
                details.Add(new
                {
                    TreeId = reader["TreeId"],
                    TreeName = reader["TreeName"],
                    TreeCount = reader["TreeCount"],
                    Co2Total = reader["Co2Total"]
                });
            }

            return new { header, details };
        }

        // ================= DELETE =================
        public async Task<bool> Delete(int offsetEntryId)
        {
            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_OffsetEntry_Delete";
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(new SqlParameter("@OffsetEntryId", offsetEntryId));

            await cmd.ExecuteNonQueryAsync();

            return true;
        }


        // ================= GET ALL =================
        public async Task<object> GetAll(
       int pageNumber,
       int pageSize,
       string search,
       int? projectId,
       int? financialYear
   )
        {
            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_OffsetEntry_GetAll";
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(new SqlParameter("@PageNumber", pageNumber));
            cmd.Parameters.Add(new SqlParameter("@PageSize", pageSize));
            cmd.Parameters.Add(new SqlParameter("@Search", search));
            cmd.Parameters.Add(new SqlParameter("@ProjectId", projectId));
            cmd.Parameters.Add(new SqlParameter("@FinancialYear", financialYear));

            int totalRecords = 0;
            var data = new List<object>();
            object summary = null;

            using var reader = await cmd.ExecuteReaderAsync();

            //DATA
            while (await reader.ReadAsync())
            {
                data.Add(new
                {
                    OffsetEntryId = reader["OffsetEntryId"],
                    ProjectName = reader["ProjectName"],
                    FinancialYear = reader["FinancialYear"],
                    TotalOffset = reader["TotalOffset"] != DBNull.Value
                        ? Convert.ToDecimal(reader["TotalOffset"])
                        : 0,
                    EntryDate = reader["EntryDate"]
                });
            }

            //TOTAL COUNT
            await reader.NextResultAsync();

            if (await reader.ReadAsync())
            {
                totalRecords = Convert.ToInt32(reader["TotalRecords"]);
            }

            //SUMMARY 
            await reader.NextResultAsync();

            if (await reader.ReadAsync())
            {
                summary = new
                {
                    FinancialYear = reader["FinancialYear"],
                    VehicleEmission = reader["VehicleEmission"],
                    GeneratorEmission = reader["GeneratorEmission"],
                    TotalEmission = reader["TotalEmission"],
                    TotalOffset = reader["TotalOffset"] != DBNull.Value
                        ? Convert.ToDecimal(reader["TotalOffset"])
                        : 0,
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

        public async Task<OffsetEntrySaveDraftResponseDTO> SaveDraftAsync(OffsetEntrySaveDraftRequestDTO request)
        {
            var result = new OffsetEntrySaveDraftResponseDTO();

            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_OffsetEntrySaveDraft";
            cmd.CommandType = CommandType.StoredProcedure;
            var projectParam = cmd.CreateParameter();
            projectParam.ParameterName = "@ProjectId";
            projectParam.DbType = DbType.Int32;
            projectParam.Value = request.ProjectId;
            cmd.Parameters.Add(projectParam);

            var entryByParam = cmd.CreateParameter();
            entryByParam.ParameterName = "@EntryBy";
            entryByParam.DbType = DbType.String;
            entryByParam.Value = request.EntryBy;
            cmd.Parameters.Add(entryByParam);
            var table = new DataTable();
            table.Columns.Add("TreeId", typeof(int));
            table.Columns.Add("TreeCount", typeof(int));

            foreach (var item in request.Trees)
            {
                table.Rows.Add(item.TreeId, item.TreeCount);
            }

            //TABLE TYPE PARAMETER
            var treeParam = new SqlParameter("@TreeData", SqlDbType.Structured)
            {
                TypeName = "dbo.TreeTypes",  
                Value = table
            };

            cmd.Parameters.Add(treeParam);

            using var reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                result.OffsetEntryId = Convert.ToInt32(reader["OffsetEntryId"]);
                result.TotalOffset = Convert.ToDecimal(reader["TotalOffset"]);
            }

            return result;
        }

     
           public async Task<OffsetEntryResponseDTO> InsertOffsetEntry(OffsetEntryDto model)
        {
            var response = new OffsetEntryResponseDTO();

            using var con = new SqlConnection(_config.GetConnectionString("DbString"));
            using var cmd = new SqlCommand("USP_CB_OffsetEntry_Insert", con);

            cmd.CommandType = CommandType.StoredProcedure;

            // ✅ NORMAL PARAMETERS
            cmd.Parameters.Add(new SqlParameter("@ProjectId", SqlDbType.Int)
            {
                Value = model.ProjectId
            });

            cmd.Parameters.Add(new SqlParameter("@EntryBy", SqlDbType.NVarChar)
            {
                Value = (object?)model.EntryBy ?? DBNull.Value
            });

            cmd.Parameters.Add(new SqlParameter("@FinancialYear", SqlDbType.NVarChar)
            {
                Value = model.FinancialYear   // 🔥 NEW
            });

            // 🔥 TABLE TYPE (VERY IMPORTANT)
            DataTable dt = new DataTable();
            dt.Columns.Add("TreeId", typeof(int));
            dt.Columns.Add("TreeCount", typeof(int));

            foreach (var item in model.Trees)
            {
                dt.Rows.Add(item.TreeId, item.TreeCount);
            }

            var tvpParam = new SqlParameter("@TreeData", SqlDbType.Structured)
            {
                TypeName = "dbo.TreeType",   // ⚠️ MUST MATCH SQL TYPE
                Value = dt
            };

            cmd.Parameters.Add(tvpParam);

            await con.OpenAsync();

            using var reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                response.OffsetEntryId = Convert.ToInt32(reader["OffsetEntryId"]);
                response.PreviousYearEmission = Convert.ToDecimal(reader["PreviousYearEmission"]);
                response.TotalOffset = Convert.ToDecimal(reader["TotalOffset"]);
            }

            return response;
        }
    
    }
}