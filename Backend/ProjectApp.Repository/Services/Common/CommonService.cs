using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProjectApp.Core.Context;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Common;

namespace ProjectApp.Repository.Services.Common
{
    public class CommonService<T> : ICommonService<T> where T : class
    {

        private readonly CBContext  _dBContext;
        private DbSet<T> _dbSet;

        public CommonService(CBContext projectDBContext)
        {
            _dBContext = projectDBContext;
            _dbSet = _dBContext.Set<T>();
        }
        public async Task<T> CreateAsync(T dbRecord)
        {
            _dbSet.Add(dbRecord);
            await _dBContext.SaveChangesAsync();
            return dbRecord;
        }

        public async Task<bool> Delete(T dbRecord)
        {
            _dbSet.Remove(dbRecord);
            await _dBContext.SaveChangesAsync();
            return true;
        }

        public async Task<List<T>> GetAllAsync()
        {
            return await _dbSet.ToListAsync();
        }

        public async Task<T> GetAllByFilterAsync(System.Linq.Expressions.Expression<Func<T, bool>> filter, bool useNoTracking = false)
        {
            if (useNoTracking)
            {
                return await _dbSet.AsNoTracking().Where(filter).FirstOrDefaultAsync();

            }
            else
            {
                return await _dbSet.Where(filter).FirstOrDefaultAsync();
            }
        }

        public async Task<List<T>> GetAllData(System.Linq.Expressions.Expression<Func<T, bool>> filter,bool useNoTracking = false)
        {
            if (useNoTracking)
            {
                return await _dbSet.AsNoTracking().Where(filter).ToListAsync();

            }
            else
            {
                return await _dbSet.Where(filter).ToListAsync();
            }
        }

        public async Task<T> GetById(System.Linq.Expressions.Expression<Func<T, bool>> filter, bool useNoTracking = false, Func<IQueryable<T>, IQueryable<T>> include = null)
        {
            IQueryable<T> query = _dbSet;

            // ✅ Apply Include if provided
            if (include != null)
            {
                query = include(query);
            }
            if (useNoTracking)
            {
                query = query.AsNoTracking();
            }
            //else
            //{
            //    return await _dbSet.Where(filter).FirstOrDefaultAsync();
            //}
            return await query.FirstOrDefaultAsync(filter);
        }


        public IQueryable<T> GetQueryable()
        {
            return _dbSet.AsQueryable();
        }

        public async Task<T> UpdateAsync(T dbRecord)
        {
            _dbSet.Update(dbRecord);
            await _dBContext.SaveChangesAsync();

            return dbRecord;
        }
    }
}
