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

        // ================= INSERT =================
        public async Task<int> InsertOffsetEntry(OffsetEntryDto model)
        {
            using var con = new SqlConnection(_config.GetConnectionString("DbString"));
            using var cmd = new SqlCommand("USP_CB_OffsetEntry_Insert", con);

            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@ProjectId", model.ProjectId);
            cmd.Parameters.AddWithValue("@EntryBy", model.EntryBy ?? (object)DBNull.Value);

            // 🔥 Convert List → DataTable (TVP)
            DataTable dt = new DataTable();
            dt.Columns.Add("TreeId", typeof(int));
            dt.Columns.Add("TreeCount", typeof(int));

            foreach (var item in model.Trees)
            {
                dt.Rows.Add(item.TreeId, item.TreeCount);
            }

            var tvpParam = cmd.Parameters.AddWithValue("@TreeData", dt);
            tvpParam.SqlDbType = SqlDbType.Structured;
            tvpParam.TypeName = "TreeType";

            await con.OpenAsync();
            var result = await cmd.ExecuteScalarAsync();

            return Convert.ToInt32(result);
        }

        // ================= GET ALL =================
        public async Task<object> GetAll(int pageNumber, int pageSize, string search)
        {
            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_OffsetEntry_GetAll";
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(new SqlParameter("@PageNumber", pageNumber));
            cmd.Parameters.Add(new SqlParameter("@PageSize", pageSize));
            cmd.Parameters.Add(new SqlParameter("@Search", search ?? (object)DBNull.Value));

            int totalRecords = 0;
            var data = new List<object>();
            object summary = null;

            using var reader = await cmd.ExecuteReaderAsync();

            // ================= 1️⃣ DATA =================
            while (await reader.ReadAsync())
            {
                data.Add(new
                {
                    OffsetEntryId = reader["OffsetEntryId"],
                    ProjectName = reader["ProjectName"],
                    FinancialYear = reader["FinancialYear"],
                    TotalOffset = reader["TotalOffset"] == DBNull.Value
    ? 0
    : Convert.ToDecimal(reader["TotalOffset"]),
                    EntryDate = reader["EntryDate"]
                });
            }

            // ================= 2️⃣ TOTAL COUNT =================
            await reader.NextResultAsync();

            if (await reader.ReadAsync())
            {
                totalRecords = Convert.ToInt32(reader["TotalRecords"]);
            }

            // ================= 3️⃣ SUMMARY =================
            await reader.NextResultAsync();

            if (await reader.ReadAsync())
            {
                summary = new
                {
                    FinancialYear = reader["FinancialYear"],
                    VehicleEmission = reader["VehicleEmission"],
                    GeneratorEmission = reader["GeneratorEmission"],
                    TotalEmission = reader["TotalEmission"],
                    TotalOffset = reader["TotalOffset"] == DBNull.Value
            ? 0
            : Convert.ToDecimal(reader["TotalOffset"]),
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
    }
}