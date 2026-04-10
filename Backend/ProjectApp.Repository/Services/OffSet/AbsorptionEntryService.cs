using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
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

        //public async Task<OffsetEntrySaveDraftResponseDTO> SaveDraftAsync(OffsetEntrySaveDraftRequestDTO request)
        //{
        //    var result = new OffsetEntrySaveDraftResponseDTO();

        //    //--------------------------------------------
        //    // ✅ STEP 1: VALIDATE INPUT
        //    //--------------------------------------------
        //    if (string.IsNullOrEmpty(request.ProjectId))
        //        throw new Exception("ProjectId is required.");

        //    //--------------------------------------------
        //    // ✅ STEP 2: PARSE OR DECODE
        //    //--------------------------------------------
        //    int decodedProjectId;

        //    // Try normal int (like 10)
        //    if (!int.TryParse(request.ProjectId, out decodedProjectId))
        //    {
        //        // fallback decode (like "YvnOD6Ao")
        //        decodedProjectId = _encoder.Decode(request.ProjectId);
        //    }

        //    if (decodedProjectId <= 0)
        //        throw new Exception("Invalid ProjectId.");

        //    //--------------------------------------------
        //    // ✅ STEP 3: CHECK PROJECT EXISTS
        //    //--------------------------------------------
        //    using (var checkConn = _context.Database.GetDbConnection())
        //    {
        //        await checkConn.OpenAsync();

        //        using var checkCmd = checkConn.CreateCommand();
        //        checkCmd.CommandText = @"SELECT COUNT(1) 
        //                        FROM CB_PlantationProject 
        //                        WHERE ProjectId = @ProjectId AND IsActive = 1";

        //        checkCmd.Parameters.Add(new SqlParameter("@ProjectId", decodedProjectId));

        //        var exists = Convert.ToInt32(await checkCmd.ExecuteScalarAsync());

        //        if (exists == 0)
        //            throw new Exception($"ProjectId {decodedProjectId} does not exist in DB.");
        //    }

        //    //--------------------------------------------
        //    // ✅ STEP 4: MAIN INSERT
        //    //--------------------------------------------
        //    using var conn = new SqlConnection(_config.GetConnectionString("DbString"));
        //    await conn.OpenAsync();

        //    using var cmd = conn.CreateCommand();
        //    cmd.CommandText = "USP_CB_OffsetEntrySaveDraft";
        //    cmd.CommandType = CommandType.StoredProcedure;

        //    cmd.Parameters.Add(new SqlParameter("@ProjectId", SqlDbType.Int)
        //    {
        //        Value = decodedProjectId
        //    });

        //    cmd.Parameters.Add(new SqlParameter("@EntryBy", SqlDbType.NVarChar)
        //    {
        //        Value = request.EntryBy ?? (object)DBNull.Value
        //    });

        //    //--------------------------------------------
        //    // ✅ TREE VALIDATION
        //    //--------------------------------------------
        //    if (request.Trees == null || !request.Trees.Any())
        //        throw new Exception("Tree data is empty.");

        //    var table = new DataTable();
        //    table.Columns.Add("TreeId", typeof(int));
        //    table.Columns.Add("TreeCount", typeof(int));

        //    foreach (var item in request.Trees)
        //    {
        //        int decodedTreeId = _encoder.Decode(item.TreeId);

        //        if (decodedTreeId <= 0)
        //            throw new Exception($"Invalid TreeId: {item.TreeId}");

        //        table.Rows.Add(decodedTreeId, item.TreeCount);
        //    }

        //    cmd.Parameters.Add(new SqlParameter("@TreeData", SqlDbType.Structured)
        //    {
        //        TypeName = "dbo.TreeType",
        //        Value = table
        //    });

        //    using var reader = await cmd.ExecuteReaderAsync();

        //    if (await reader.ReadAsync())
        //    {
        //        result.OffsetEntryId = Convert.ToInt32(reader["OffsetEntryId"]);
        //        result.TotalOffset = Convert.ToDecimal(reader["TotalOffset"]);
        //    }

        //    return result;
        //}

        public async Task<OffsetEntryResponseDTO> InsertOffsetEntry(OffsetEntryDto model, string currentUsername, bool isDraft)
        {
          

            if (string.IsNullOrEmpty(model.ProjectId))
                throw new ArgumentException("ProjectId is required.");

            var response = new OffsetEntryResponseDTO();

            int decodedProjectId;

            if (!int.TryParse(model.ProjectId, out decodedProjectId))
            {
                decodedProjectId = _encoder.Decode(model.ProjectId);
            }

            if (decodedProjectId <= 0)
                throw new Exception("Invalid ProjectId.");

            if (model.Trees == null || !model.Trees.Any())
                throw new Exception("At least one Tree entry is required.");

            using var con = _context.Database.GetDbConnection();
            await con.OpenAsync();

            using var cmd = con.CreateCommand();
            cmd.CommandText = "USP_CB_OffsetEntry_Insert";
            cmd.CommandType = CommandType.StoredProcedure;

            // 🔥 ADD THIS (MOST IMPORTANT FIX)
            cmd.Parameters.Add(new SqlParameter("@OffsetEntryId", SqlDbType.Int)
            {
                Value = model.OffsetEntryId > 0 ? model.OffsetEntryId : (object)DBNull.Value
            });

            cmd.Parameters.Add(new SqlParameter("@ProjectId", decodedProjectId));
            cmd.Parameters.Add(new SqlParameter("@EntryBy", SqlDbType.NVarChar)
            {
                Value = currentUsername ?? (object)DBNull.Value
            });
            cmd.Parameters.Add(new SqlParameter("@FinancialYear", model.FinancialYear));
            cmd.Parameters.Add(new SqlParameter("@IsDraft", isDraft));
            var table = new DataTable();
            table.Columns.Add("TreeId", typeof(int));
            table.Columns.Add("TreeCount", typeof(int));

            foreach (var item in model.Trees)
            {
                int decodedTreeId = _encoder.Decode(item.TreeId);

                if (decodedTreeId <= 0)
                    throw new Exception($"Invalid TreeId '{item.TreeId}'");

                table.Rows.Add(decodedTreeId, item.TreeCount);
            }

            cmd.Parameters.Add(new SqlParameter("@TreeData", SqlDbType.Structured)
            {
                TypeName = "dbo.TreeType",
                Value = table
            });

            using var reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                response.OffsetEntryId = Convert.ToInt32(reader["OffsetEntryId"]);
                response.PreviousYearEmission = Convert.ToDecimal(reader["PreviousYearEmission"]);
                response.TotalOffset = Convert.ToDecimal(reader["TotalOffset"]);
            }

            return response;
        }



        public async Task<object> GetPlannedData(string projectId)
        {
            int decodedProjectId = _encoder.Decode(projectId);

            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();

                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "USP_CB_FinalEntry_GetByProject";
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(new SqlParameter("@ProjectId", decodedProjectId));

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        decimal targetCo2 = 0;
                        decimal actualCo2 = 0;

                        // 🔹 HEADER (UPDATED)
                        if (await reader.ReadAsync())
                        {
                            targetCo2 = reader["TargetCo2"] != DBNull.Value
                                ? Convert.ToDecimal(reader["TargetCo2"])
                                : 0;

                            actualCo2 = reader["ActualCo2"] != DBNull.Value
                                ? Convert.ToDecimal(reader["ActualCo2"])
                                : 0;
                        }

                        // 🔹 DETAILS
                        var treeList = new List<object>();

                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                treeList.Add(new
                                {
                                    treeId = _encoder.Encode(Convert.ToInt32(reader["TreeId"])),
                                    treeName = reader["TreeName"].ToString(),
                                    co2PerTree = Convert.ToDecimal(reader["Co2PerTree"]),
                                    treeCount = Convert.ToInt32(reader["TreeCount"])
                                });
                            }
                        }

                        // 🔥 FINAL RESPONSE (UPDATED STRUCTURE)
                        return new
                        {
                            targetCo2,
                            actualCo2,
                            trees = treeList
                        };
                    }
                }
            }
         }



        public async Task<object> CheckByProject(string projectId)
        {
            int decodedProjectId = _encoder.Decode(projectId);

            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_OffsetEntry_CheckByProject";
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(new SqlParameter("@ProjectId", decodedProjectId));

            using var reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new
                {
                    OffsetEntryId = Convert.ToInt32(reader["OffsetEntryId"]),
                    IsDraft = Convert.ToBoolean(reader["IsDraft"])
                };
            }

            return null;
        }

        public async Task<PagedResponse<OffsetEntrySearchDto>> Search(
    int pageNumber,
    int pageSize,
    string search,
    int? projectId,
    int? financialYear)
        {
            using var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "USP_CB_OffsetEntrySearch"; 
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.Add(new SqlParameter("@Search", (object?)search ?? DBNull.Value));
            cmd.Parameters.Add(new SqlParameter("@ProjectId", (object?)projectId ?? DBNull.Value));
            cmd.Parameters.Add(new SqlParameter("@FinancialYear", (object?)financialYear ?? DBNull.Value));
            cmd.Parameters.Add(new SqlParameter("@PageNumber", pageNumber));
            cmd.Parameters.Add(new SqlParameter("@PageSize", pageSize));

            var list = new List<OffsetEntrySearchDto>();
            int totalRecords = 0;

            using var reader = await cmd.ExecuteReaderAsync();

            // ✅ DATA
            while (await reader.ReadAsync())
            {
                list.Add(new OffsetEntrySearchDto
                {
                    OffsetEntryId = Convert.ToInt32(reader["OffsetEntryId"]),
                    ProjectName = reader["ProjectName"].ToString(),
                    FinancialYear = reader["FinancialYear"] != DBNull.Value ? Convert.ToInt32(reader["FinancialYear"]) : null,
                    PreviousYearEmission = reader["PreviousYearEmission"] != DBNull.Value ? Convert.ToDecimal(reader["PreviousYearEmission"]) : 0,
                    TotalOffset = reader["TotalOffset"] != DBNull.Value ? Convert.ToDecimal(reader["TotalOffset"]) : 0,
                    RemainingEmission = reader["RemainingEmission"] != DBNull.Value ? Convert.ToDecimal(reader["RemainingEmission"]) : 0,
                    Status = reader["Status"].ToString(),
                    EntryBy = reader["EntryBy"].ToString(),
                    EntryDate = reader["EntryDate"] != DBNull.Value ? Convert.ToDateTime(reader["EntryDate"]) : null
                });
            }

            await reader.NextResultAsync();

            if (await reader.ReadAsync())
            {
                totalRecords = Convert.ToInt32(reader["TotalRecords"]);
            }

            return new PagedResponse<OffsetEntrySearchDto>
            {
                Data = list,
                TotalRecords = totalRecords,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }


    }
}