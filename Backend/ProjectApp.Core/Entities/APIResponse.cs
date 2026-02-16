using System.Net;

namespace ProjectApp.Core.Entities
{
    public class APIResponse
    {
        //indicates success or failure of response
        public bool status { get; set; }

        //status code of response
        public HttpStatusCode StatusCode { get; set; }
        //data in response
        public dynamic data { get; set; }
        //list of errors if any
        public List<string> Errors
        {
            get; set;
        } = new List<string>();
    }
}
