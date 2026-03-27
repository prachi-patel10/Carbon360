namespace ProjectApp.Core.DTOs.Account.Login
{
    public class LoginResDTO
    {
        public string UserName { get; set; }

        public string FirstName { get; set; }
        public List<string> Roles { get; set; }   // ALL roles
        public string CurrentRole { get; set; }   // Default role
        public string Token { get; set; }
    }
}
