using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.DTOs.Account.Role;
using ProjectApp.Core.Entities;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Interfaces.Masters.Role;
using ProjectApp.Repository.Interfaces.User;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Utilities.Auth;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Services.Masters.Role
{
    public class RoleService : IRoleService
    {
        private readonly IMapper _mapper;
        private readonly ICommonService<CB_Role> _roleService;
        private readonly CBContext _context;
        private readonly IUserContext _userContext;
        private readonly IdEncoder _idEncoder;

        public RoleService(IMapper mapper, ICommonService<CB_Role> common,CBContext context, IUserContext userContext, IdEncoder idEncoder)
        {
            _mapper = mapper;
            _roleService = common;
            _context = context;
            _userContext = userContext;
            _idEncoder = idEncoder;

        }
        private int GetCurrentUserId()
        {
            return _userContext.UserId;
        }


        public async Task<string> CreateRoleAsync(RoleDTO dto)
        {
            var userId = GetCurrentUserId();

            var result = await _context.Database
                .SqlQueryRaw<int>(
                    "EXEC USP_CB_RoleInsert @RoleName={0}, @Description={1}, @EntryBy={2}",
                    dto.RoleName,
                    dto.RoleDescription,
                    userId)
                .ToListAsync();

            var newId = result.FirstOrDefault();

            return _idEncoder.Encode(newId);
        }



        public async Task<bool> DeleteRoleAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);
            var userId = GetCurrentUserId();

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_RoleDelete @RoleId={0}, @UserId={1}",
                id,
                userId);

            return true;
        }



        public async Task<List<RoleResponseDTO>> GetAllRolesAsync()
        {
            var roles = await _context.Database
                .SqlQueryRaw<RoleDTO>("EXEC USP_CB_RoleGetAll")
                .ToListAsync();

            return roles.Select(role => new RoleResponseDTO
            {
                Id = _idEncoder.Encode(role.Id),
                RoleName = role.RoleName,
                RoleDescription = role.RoleDescription,
                IsActive = role.IsActive
            }).ToList();
        }



        public async Task<RoleResponseDTO> GetRoleByIdAsync(string encryptedId)
        {
            int id = _idEncoder.Decode(encryptedId);

            var role = await _context.CB_Roles
                .FirstOrDefaultAsync(x => x.RoleId == id && x.IsDeleted == false);

            if (role == null)
                return null;

            return new RoleResponseDTO
            {
                Id = _idEncoder.Encode(role.RoleId),
                RoleName = role.RoleName,
                RoleDescription = role.Description,
                IsActive = role.IsActive ?? false
            };
        }


        public async Task<bool> UpdateRoleAsync(RoleDTO dto)
        {
            var userId = GetCurrentUserId();

            await _context.Database.ExecuteSqlRawAsync(
                "EXEC USP_CB_RoleUpdate @RoleId={0}, @RoleName={1}, @Description={2}, @IsActive={3}, @UserId={4}",
                dto.Id,
                dto.RoleName,
                dto.RoleDescription,
                dto.IsActive,
                userId);

            return true;
        }


        public int DecodeId(string encryptedId)
        {
            return _idEncoder.Decode(encryptedId);
        }


    }
}
