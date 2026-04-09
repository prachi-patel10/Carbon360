using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Account.OffSet;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.OffSet;
using ProjectApp.Repository.Utilities.Auth;
using System.Data;

public class FinalService : IFinalService
{
    private readonly CBContext _context;
    private readonly IdEncoder _idEncoder;

    public FinalService(CBContext context, IdEncoder idEncoder)
    {
        _context = context;
        _idEncoder = idEncoder;
    }

    public async Task<List<ProjectDropdownDTO>> GetUserProjects(int userId)
    {
        var result = new List<ProjectDropdownDTO>();

        using (var conn = _context.Database.GetDbConnection())
        {
            await conn.OpenAsync();

            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "USP_CB_ProjectDropdown_UserWise";
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.Add(new SqlParameter("@UserId", userId));

                using (var reader = await cmd.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        int projectId = Convert.ToInt32(reader["ProjectId"]);

                        result.Add(new ProjectDropdownDTO
                        {
                            ProjectId = _idEncoder.Encode(projectId),  // 🔥 ENCODE HERE
                            ProjectName = reader["ProjectName"].ToString()
                        });
                    }
                }
            }
        }
        return result;
    }

    public async Task<object> SaveFinalEntry(FinalEntryDTO model)
    {
        try
        {
            // 🔹 Decode ProjectId
            int projectId = _idEncoder.Decode(model.ProjectId);

            // 🔹 Create DataTable for TVP
            DataTable dt = new DataTable();
            dt.Columns.Add("TreeId", typeof(int));
            dt.Columns.Add("TreeCount", typeof(int));

            foreach (var item in model.Trees)
            {
                dt.Rows.Add(
                    _idEncoder.Decode(item.TreeId), // decode treeId
                    item.TreeCount
                );
            }

            using (var conn = _context.Database.GetDbConnection())
            {
                await conn.OpenAsync();

                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "USP_CB_SaveFinalEntry";
                    cmd.CommandType = CommandType.StoredProcedure;

                    // 🔹 Parameters
                    cmd.Parameters.Add(new SqlParameter("@ProjectId", projectId));
                    cmd.Parameters.Add(new SqlParameter("@EntryBy", model.EntryBy));

                    var tvpParam = new SqlParameter("@TreeDetails", dt)
                    {
                        SqlDbType = SqlDbType.Structured,
                        TypeName = "TreeType" // 🔥 CHANGE if your type name is different
                    };

                    cmd.Parameters.Add(tvpParam);

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            return new
                            {
                                FinalEntryId = reader["FinalEntryId"],
                                TotalTrees = reader["TotalActualTrees"],
                                TotalCo2 = reader["TotalActualCo2"]
                            };
                        }
                    }
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            throw new Exception("Error while saving final entry: " + ex.Message);
        }
    }







}