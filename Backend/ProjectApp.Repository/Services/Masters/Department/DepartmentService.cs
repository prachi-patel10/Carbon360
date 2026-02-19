using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Masters.Department;
using ProjectApp.Core.Entities;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.Department;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Utilities.Auth;
using ProjectApp.Repository.Utilities.SP;

namespace ProjectApp.Repository.Services.Masters.Department
{
    public class DepartmentService : BaseService<CB_Department>, IDepartmentService
    {
        private readonly IMapper _mapper;
        private readonly CBContext _context;
        private readonly IdEncoder _idEncoder;

        public DepartmentService(
            IMapper mapper,
            ICommonService<CB_Department> common,
            CBContext context,
            IUserContext userContext,
            IdEncoder idEncoder
        ) : base(common, mapper, userContext)
        {
            _mapper = mapper;
            _context = context;
            _idEncoder = idEncoder;
        }

        // ================= CREATE =================

        public async Task<DepartmentResponseDTO> CreateDepartmentAsync(DepartmentCreateDTO dto)
        {
            int userId = GetCurrentUserId();

            var result = await _context.Database
                .SqlQueryRaw<int>(
                    "EXEC USP_CB_DepartmentInsert @DepartmentName={0}, @UserId={1}",
                    dto.DepartmentName, userId)
                .ToListAsync();

            int newId = result.FirstOrDefault();

            var department = await _context.CB_Departments
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.DepartmentId == newId);

            if (department == null)
                return null;

            var response = _mapper.Map<DepartmentResponseDTO>(department);
            response.Id = _idEncoder.Encode(department.DepartmentId);

            return response;
        }

        // ================= UPDATE =================

        public async Task<bool> UpdateDepartmentAsync(DepartmentUpdateDTO dto)
        {
            int userId = GetCurrentUserId();
            int id = _idEncoder.Decode(dto.Id);

            var rows = await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_DepartmentUpdate @DepartmentId={0}, @DepartmentName={1}, @UserId={2}",
                id, dto.DepartmentName, userId);

            return rows > 0;
        }

        // ================= DELETE =================

        public async Task<bool> DeleteDepartmentAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);
            int userId = GetCurrentUserId();

            var rows = await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_DepartmentDelete @DepartmentId={0}, @UserId={1}",
                id, userId);

            return rows > 0;
        }

        // ================= GET ALL =================

        public async Task<List<DepartmentResponseDTO>> GetAllDepartmentsAsync()
        {
            var departments = await _context.CB_Departments
                .FromSqlRaw("EXEC USP_CB_DepartmentGetAll")
                .AsNoTracking()
                .ToListAsync();

            var response = _mapper.Map<List<DepartmentResponseDTO>>(departments);

            for (int i = 0; i < departments.Count; i++)
            {
                response[i].Id = _idEncoder.Encode(departments[i].DepartmentId);
            }

            return response;
        }

        // ================= GET BY ID =================

        public async Task<DepartmentResponseDTO> GetDepartmentByIdAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            var departments = await _context.CB_Departments
                .FromSqlRaw("EXEC USP_CB_DepartmentGetById @DepartmentId={0}", id)
                .AsNoTracking()
                .ToListAsync();

            var department = departments.FirstOrDefault();

            if (department == null)
                return null;

            var response = _mapper.Map<DepartmentResponseDTO>(department);
            response.Id = _idEncoder.Encode(department.DepartmentId);

            return response;
        }

        // ================= GET BY NAME =================

        public async Task<DepartmentResponseDTO> GetDepartmentByNameAsync(string name)
        {
            var departments = await _context.CB_Departments
                .FromSqlRaw("EXEC USP_CB_DepartmentGetByName @DepartmentName={0}", name)
                .AsNoTracking()
                .ToListAsync();

            var department = departments.FirstOrDefault();

            if (department == null)
                return null;

            var response = _mapper.Map<DepartmentResponseDTO>(department);
            response.Id = _idEncoder.Encode(department.DepartmentId);

            return response;
        }

        // ================= SEARCH WITH PAGING =================

        public async Task<PageResult> SearchDepartmentsAsync(SearchRequest request)
        {
            var parameters = SpParameterBuilder.BuildSearchParams(request);

            var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "USP_CB_DepartmentSearch";
            command.CommandType = System.Data.CommandType.StoredProcedure;

            foreach (var param in parameters)
                command.Parameters.Add(param);

            using var reader = await command.ExecuteReaderAsync();

            int totalRecords = 0;
            if (await reader.ReadAsync())
            {
                totalRecords = reader.GetInt32(0);
            }

            await reader.NextResultAsync();

            var departments = new List<CB_Department>();

            while (await reader.ReadAsync())
            {
                departments.Add(new CB_Department
                {
                    DepartmentId = reader.GetInt32(reader.GetOrdinal("DepartmentId")),
                    DepartmentName = reader["DepartmentName"].ToString(),
                    IsActive = reader["IsActive"] as bool?,
                    EntryDate = reader["EntryDate"] as DateTime?,
                    UpdateDate = reader["UpdateDate"] as DateTime?
                });
            }

            await connection.CloseAsync();

            var dtoList = _mapper.Map<List<DepartmentResponseDTO>>(departments);

            for (int i = 0; i < departments.Count; i++)
            {
                dtoList[i].Id = _idEncoder.Encode(departments[i].DepartmentId);
            }

            return new PageResult
            {
                Data = dtoList,
                TotalRecords = totalRecords,
                CurrentPage = request.PageNumber,
                TotalPages = (int)Math.Ceiling((double)totalRecords / request.PageSize)
            };
        }

        // ================= TOGGLE STATUS (NO SP) =================

        public async Task<bool> ToggleStatusAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);
            int userId = GetCurrentUserId();

            var department = await _context.CB_Departments
                .FirstOrDefaultAsync(x =>
                    x.DepartmentId == id &&
                    (x.IsDeleted == false || x.IsDeleted == null));

            if (department == null)
                return false;

            department.IsActive = !(department.IsActive ?? false);
            department.UpdateBy = userId;
            department.UpdateDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }
    }
}
