using ProjectApp.Core.DTOs.Masters.Tree;
using ProjectApp.Repository.Utilities.SP;
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
        Task<TreeDetailsDTO> GetTreeDetailsAsync(TreeRequestDTO request);

        Task<TreeResponseDTO> GetTreeByIdAsync(string encryptedId);

        Task<TreeResponseDTO> CreateTreeAsync(TreeCreateDTO dto);

        Task<bool> UpdateTreeAsync(TreeUpdateDTO dto);

        Task<bool> DeleteTreeAsync(string encryptedId);

        Task<PageResult> SearchTreesAsync(TreeSearchDTO dto);

        Task<bool> UpdateStatusAsync(TreeMasterStatusUpdateDTO dto);

    }
}
