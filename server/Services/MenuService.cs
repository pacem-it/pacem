using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Pacem.Js.CustomElements.Services
{
    public class MenuService
    {
        private readonly IMemoryCache _cache;
        private readonly IHostingEnvironment _env;

        public MenuService(IMemoryCache cache, IHostingEnvironment env)
        {
            _cache = cache;
            _env = env;
        }

        public IEnumerable<Models.MenuPackage> GetMenu()
        {
            return _cache.GetOrCreate("menu", cache =>
            {
                cache.AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1D);
                var menuFile = _env.WebRootFileProvider.GetFileInfo("menu.json");
                using (var stream = menuFile.CreateReadStream())
                {
                    byte[] buffer = new byte[stream.Length];
                    stream.Read(buffer);
                    string menuJson = Encoding.UTF8.GetString(buffer);
                    return JsonConvert.DeserializeObject<List<Models.MenuPackage>>(menuJson);
                }
            });
        }
    }
}
