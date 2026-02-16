using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.Context;
using ProjectApp.Core.DTOs;
using ProjectApp.Core.Entities;
using ProjectApp.Repository.Interfaces.Common;
using ProjectApp.Repository.Services.Common;
using ProjectApp.Repository.Utilities.Auth;
using ProjectApp.Repository.Utilities.SP;
using Microsoft.Data.SqlClient;
using ProjectApp.Repository.Interfaces.Masters.Section;
using ProjectApp.Core.DTOs.Masters.Section;

namespace ProjectApp.Repository.Services.Masters.Section
{
    public class SectionService : ISectionService
    {
        private readonly IMapper _mapper;
        private readonly ICommonService<Sections> _sectionService;
        private readonly ProjectDBContext _dbContext;
        private readonly IdEncoder _hashService;
        private readonly ISPService _spService;
        public SectionService(ICommonService<Sections> sectionService, IMapper mapper, ProjectDBContext dbContext, IdEncoder idEncoder, ISPService sP)
        {
            _spService = sP;
            _sectionService = sectionService;
            _mapper = mapper;
            _dbContext = dbContext;
            _hashService = idEncoder;
        }

        public async Task<bool> CreateAsync(SectionDTO data, int loggedInUserId)
        {
            if (data == null) throw new ArgumentNullException("data not found");

            if (!string.IsNullOrWhiteSpace(data.ShortCode) && data.ShortCode.Length > 3)
            {
                throw new Exception("ShortCode must not be greater than 3 characters");
            }

            var shortcodeEx = await _sectionService.GetAllByFilterAsync(s => s.ShortCode == data.ShortCode && !s.IsDeleted);
            if (shortcodeEx != null)
            {
                throw new Exception("ShortCode AllReady Exits");
            }

            var exSectionName = await _sectionService.GetAllByFilterAsync(s => s.DepartmentId == data.DepartmentId && s.SectionName == data.SectionName && !s.IsDeleted);
            if (exSectionName != null)
            {
                throw new Exception("Section name Allready Exists in department");
            }
            Sections s = _mapper.Map<Sections>(data);
            s.EntryBy = loggedInUserId;

            s.EntryDate = DateTime.Now;
            s.UpdateDate = DateTime.Now;
            //s.IsActive = true;
            s.IsDeleted = false;

            var addedUser = await _sectionService.CreateAsync(s);
            return true;
            // Continue with your implementation
            //throw new NotImplementedException();
        }


        public async Task<bool> DeleteAsync(int sectionId, int loggedInUserId)
        {
            var section = await _sectionService.GetAllByFilterAsync(u => u.id == sectionId, true);

            if (section == null)
                throw new Exception("Section not found");


            section.IsDeleted = true;

            section.UpdatedBy = loggedInUserId;
            section.UpdateDate = DateTime.Now;

            await _sectionService.UpdateAsync(section);

            return true;

            //throw new NotImplementedException();
        }

        public Task<Sections> EditSectionAsync(Sections data)
        {
            throw new NotImplementedException();
        }

        public async Task<List<SectionViewDTO>> GetSectionByEntryUserId(int userId)
        {
            return await _dbContext.Set<SectionViewDTO>()
                .FromSqlRaw("Exec TaskApp.dbo.spGetSections_ByEntryUser @EntryBy = {0}", userId)
                .ToListAsync();
        }

        public async Task<Sections> GetSectionById(int Id, bool isNoTracking = false)
        {
            var q = _sectionService.GetQueryable();
            if (!isNoTracking)
            {
                q = q.AsNoTracking();
            }
            return await q.Include(x => x.Department).FirstOrDefaultAsync(x => x.id == Id && !x.IsDeleted);
        }

        public async Task<SectionUpdateDTO> GetSectionByIdAsync(int Id)
        {
            //int Id = _hashService.Decode(hashId);
            if (Id <= 0)
            {
                throw new Exception("enter valid section ID");
            }

            var sect = await _sectionService.GetById(x => x.id == Id, true, include: q => q.Include(x => x.Department));

            if (sect == null)
            {
                throw new Exception("section not founr");
            }

            return new SectionUpdateDTO
            {
                Id = _hashService.Encode(sect.id),
                SectionName = sect.SectionName,
                ShortCode = sect.ShortCode,
                DepartmentId = sect.DepartmentId,
                DepartmentName = sect.Department.DepartmentName,
                IsActive = sect.IsActive

            };
            //return _mapper.Map<SectionViewDTO>(sect);
            //throw new NotImplementedException();
        }

        public async Task<Dictionary<string, object>> GetSectionSearch(SearchRequest req)
        {
            var res = await _spService.ExecuteSpAsync("spGetSections",
                new SqlParameter("@Search", req.Search ?? (object)DBNull.Value),
                new SqlParameter("@IsActive", req.IsActive ?? (object)DBNull.Value),

                new SqlParameter("@PageNumber", req.PageNumber),
                new SqlParameter("@PageSize", req.PageSize),

                new SqlParameter("@SortColumn", req.SortColumn),
                new SqlParameter("@SortDirection", req.SortDirection)

                );

            var data = (List<Dictionary<string, object>>)res["Data"];

            foreach (var row in data)
            {
                if (row.ContainsKey("Id"))
                {
                    row["Id"] = _hashService.Encode(Convert.ToInt32(row["Id"]));
                }
            }

            return res;
        }


        public async Task<bool> UpdateAsync(int sectionId, SectionDTO data, int loggedInUserId)
        {

            if (data == null)
            {
                throw new ArgumentNullException("data");
            }
            var section = await _sectionService.GetById(x => x.id == sectionId, true);

            if (section == null)
            {
                throw new Exception("Section not found with id");
            }

            section.SectionName = data.SectionName;
            section.ShortCode = data.ShortCode;
            section.DepartmentId = data.DepartmentId;
            section.IsActive = data.IsActive;

            section.UpdateDate = DateTime.Now;
            section.UpdatedBy = loggedInUserId;

            await _sectionService.UpdateAsync(section);
            return true;
        }

        public async Task<bool> UpdateSectionStatusAsync(int sectionId, int loggedInUserId)
        {
            var section = await _sectionService.GetAllByFilterAsync(u => u.id == sectionId, true);

            if (section == null)
                throw new Exception("Section not found");


            section.IsActive = !section.IsActive;

            section.UpdatedBy = loggedInUserId;
            section.UpdateDate = DateTime.Now;

            await _sectionService.UpdateAsync(section);

            return true;
        }


    }
}
