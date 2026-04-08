using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ProjectApp.Core.DTOs.Account.OffSet;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.OffSet;
using ProjectApp.Repository.Utilities.Auth;
using System.Data;

namespace ProjectApp.Repository.Services.OffSet
{
    public class AbsorptionEntryService : IAbsorptionEntry
    {
        private readonly CBContext _context;
        private readonly IConfiguration _config;
        private readonly IdEncoder _encoder;
        public AbsorptionEntryService(CBContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
            _encoder = new IdEncoder();
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
            projectParam.Value = _encoder.Decode(request.ProjectId); // decode string to int
            cmd.Parameters.Add(projectParam);

            var entryByParam = cmd.CreateParameter();
            entryByParam.ParameterName = "@EntryBy";
            entryByParam.DbType = DbType.String;
            entryByParam.Value = request.EntryBy;
            cmd.Parameters.Add(entryByParam);
            // Prepare Tree TVP
            var table = new DataTable();
            table.Columns.Add("TreeId", typeof(int));
            table.Columns.Add("TreeCount", typeof(int));

            foreach (var item in request.Trees)
            {
                table.Rows.Add(_encoder.Decode(item.TreeId), item.TreeCount);
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


        public async Task<OffsetEntryResponseDTO> InsertOffsetEntry(OffsetEntryDto model, int currentUserId)
        {
            if (string.IsNullOrEmpty(model.ProjectId))
                throw new ArgumentException("ProjectId is required.");

            var response = new OffsetEntryResponseDTO();

            // Decode ProjectId
            int decodedProjectId = _encoder.Decode(model.ProjectId);
            if (decodedProjectId <= 0)
                throw new Exception("Invalid ProjectId. Cannot insert OffsetEntry.");

            // Validate Trees
            if (model.Trees == null || !model.Trees.Any())
                throw new Exception("At least one Tree entry is required.");

            using var con = new SqlConnection(_config.GetConnectionString("DbString"));
            using var cmd = new SqlCommand("USP_CB_OffsetEntry_Insert", con)
            {
                CommandType = CommandType.StoredProcedure
            };

            // Add ProjectId
            cmd.Parameters.Add(new SqlParameter("@ProjectId", SqlDbType.Int)
            {
                Value = decodedProjectId
            });

            // Add EntryBy (logged-in user)
            cmd.Parameters.Add(new SqlParameter("@EntryBy", SqlDbType.Int)
            {
                Value = currentUserId
            });

            // Add FinancialYear
            cmd.Parameters.Add(new SqlParameter("@FinancialYear", SqlDbType.NVarChar)
            {
                Value = model.FinancialYear ?? throw new Exception("FinancialYear is required.")
            });

            // Prepare TreeData TVP
            var table = new DataTable();
            table.Columns.Add("TreeId", typeof(int));
            table.Columns.Add("TreeCount", typeof(int));

            foreach (var item in model.Trees)
            {
                int decodedTreeId = _encoder.Decode(item.TreeId);
                if (decodedTreeId <= 0)
                    throw new Exception($"Invalid TreeId '{item.TreeId}' detected.");

                table.Rows.Add(decodedTreeId, item.TreeCount);
            }

            cmd.Parameters.Add(new SqlParameter("@TreeData", SqlDbType.Structured)
            {
                TypeName = "dbo.TreeType",
                Value = table
            });

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