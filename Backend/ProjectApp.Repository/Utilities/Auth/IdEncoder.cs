using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HashidsNet;

namespace ProjectApp.Repository.Utilities.Auth
{
    public class IdEncoder
    {
        private readonly Hashids _hashids;

        public IdEncoder()
        {
            _hashids = new Hashids("SaltIsTheIdIsEncrypted", 8);
        }

        public string Encode(int id)
        {
            return _hashids.Encode(id);
        }

        public int Decode(string hash)
        {
            var numbers = _hashids.Decode(hash);
            return numbers.Length > 0 ? numbers[0] : 0;
        }
    }
}
