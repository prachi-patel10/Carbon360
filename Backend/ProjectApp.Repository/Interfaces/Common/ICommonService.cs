using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.Common
{
    public interface ICommonService<T>
    {
        Task<List<T>> GetAllAsync();

        Task<List<T>> GetAllData(Expression<Func<T, bool>> filter, bool useNoTracking = false);
        Task<T> GetById(System.Linq.Expressions.Expression<Func<T, bool>> filter, bool useNoTracking = false, Func<IQueryable<T>, IQueryable<T>> include = null);
        Task<T> GetAllByFilterAsync(Expression<Func<T, bool>> filter, bool useNoTracking = false);
        //Task<T> GetByName(Expression<Func<T, bool>> filter
        Task<T> CreateAsync(T dbRecord);
        Task<T> UpdateAsync(T dbRecord);
        IQueryable<T> GetQueryable();
        Task<bool> Delete(T dbRecord);
    }
}
