using ProjectApp.Core.DTOs.Masters.Tree;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProjectApp.Repository.Interfaces.Masters.Tree
{
    public interface ITreeService
    {
        Task<List<TreeResponseDTO>> GetAllTreesAsync();

        Task<TreeResponseDTO> GetTreeByIdAsync(string encryptedId);
    }
}
