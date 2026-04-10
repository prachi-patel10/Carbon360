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

    public async Task<List<ProjectDropdownDTO>> GetUserProjects()
    {
        var result = new List<ProjectDropdownDTO>();

        using var conn = _context.Database.GetDbConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "USP_CB_ProjectDropdown_UserWise";
        cmd.CommandType = CommandType.StoredProcedure;

        using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            result.Add(new ProjectDropdownDTO
            {
                ProjectId = _idEncoder.Encode(Convert.ToInt32(reader["ProjectId"])),
                ProjectName = reader["ProjectName"].ToString()
            });
        }

        return result;
    }

    public async Task<object> SaveFinalEntry(FinalEntryDTO model)
    {
        int projectId = _idEncoder.Decode(model.ProjectId);

        DataTable dt = new DataTable();
        dt.Columns.Add("TreeId", typeof(int));
        dt.Columns.Add("TreeCount", typeof(int));

        foreach (var item in model.Trees)
        {
            dt.Rows.Add(
                _idEncoder.Decode(item.TreeId),
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

                cmd.Parameters.Add(new SqlParameter("@ProjectId", projectId));
                cmd.Parameters.Add(new SqlParameter("@EntryBy", model.EntryBy));

                var tvpParam = new SqlParameter("@TreeDetails", dt)
                {
                    SqlDbType = SqlDbType.Structured,
                    TypeName = "TreeType"
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






}