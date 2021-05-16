using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace Pacem.Js.CustomElements.Controllers
{
    [Route("api/[controller]")]
    public class TestController : Controller
    {
        public TestController(ILogger<TestController> logger)
        {
            _logger = logger;
        }

        [HttpPost, Route("[action]")]
        public IActionResult EchoRaw()
        {
            return Ok(new { echo = Request.Form["echo"] });
        }

        [HttpPost, Route("[action]")]
        public IActionResult Echo([FromBody] object any)
        {
            return Ok(any);
        }

        [Route("[action]")]
        public IActionResult Autocomplete(string q, int? id)
        {
            int ndx = 1;
            var regions = Regions.OrderBy(r => r)
                    .Select(r => new { ID = ndx++, Name = r, Disabled = r == "Valle d'Aosta" });
            var result = regions.Where(r =>

                (!string.IsNullOrEmpty(q) && r.Name.ToLowerInvariant().Contains(q.ToLowerInvariant()))
                || (string.IsNullOrEmpty(q) && r.ID == id)

                ).OrderBy(r => r.ID);
            //System.Threading.Thread.Sleep(2000);
            object r0 = (object)result;
            return Ok(r0);
        }

        private static string[] Regions =
            {
            "Valle d'Aosta",
            "Piemonte",
            "Lombardia",
            "Veneto",
            "Trentino Alto Adige",
            "Friuli Venezia Giulia",
            "Liguria",
            "Emilia Romagna",
            "Toscana",
            "Umbria",
            "Marche",
            "Lazio",
            "Abruzzo",
            "Campania",
            "Molise",
            "Puglia",
            "Basilicata",
            "Calabria",
            "Sicilia",
            "Sardegna"
        };

        [Route("idle-random"), HttpPost]
        public async Task<IActionResult> IdleRandom([FromBody] object any)
        {
            await Task.Delay(2000);
            if (true || new Random().NextDouble() >= 0.5)
                return Ok(any);
            else
                return BadRequest("Random error");
        }

        [Route("websites")]
        public IActionResult Websites()
        {
            return Ok(websites);
        }

        [Route("blogs")]
        public IActionResult Blogs(int websiteId)
        {
            KeyPair[] result = new KeyPair[0];
            if (blogs.ContainsKey(websiteId))
            {
                result = blogs[websiteId];
            }
            return Ok(result);
        }

        [Route("blogs"), HttpPost]
        public IActionResult Blogs([FromBody] KeyPairRequest request)
        {
            var website = request?.Website;
            KeyPair[] result = new KeyPair[0];
            if (blogs.ContainsKey(website?.Id ?? 0))
            {
                result = blogs[website.Id];
            }
            return Ok(result);
        }

        [Route("channels")]
        public IActionResult Channels(int blogId)
        {
            KeyPair[] result = new KeyPair[0];
            if (channels.ContainsKey(blogId))
            {
                result = channels[blogId];
            }
            return Ok(result);
        }

        [Route("channels"), HttpPost]
        public IActionResult Channels([FromBody] KeyPairRequest request)
        {
            var blog = request?.Blog;
            KeyPair[] result = new KeyPair[0];
            if (channels.ContainsKey(blog?.Id ?? 0))
            {
                result = channels[blog.Id];
            }
            return Ok(result);
        }

        public class KeyPairRequest
        {
            public KeyPair Website { get; set; }
            public KeyPair Blog { get; set; }
        }

        public class KeyPair
        {
            public int Id { get; set; }
            public string Name { get; set; }
        }

        KeyPair[] websites = new[]
        {
            new KeyPair{ Id = 1, Name = "Pacem" },
            new KeyPair{ Id = 2, Name ="Silvia Cesari" }
        };

        Dictionary<int, KeyPair[]> blogs = new Dictionary<int, KeyPair[]>
        {
            { 1, new[]{
                new KeyPair{ Id = 1, Name = "Polyhedric"}
            } },
            { 2, new[]{
                new KeyPair{ Id = 2, Name = "Pediatrics"}
            } }
        };

        Dictionary<int, KeyPair[]> channels = new Dictionary<int, KeyPair[]>
        {
            { 1, new[]{
                new KeyPair{ Id = 1, Name = "Tetrahedron"},
                new KeyPair{ Id = 2, Name = "Octahedron"},
                new KeyPair{ Id = 3, Name = "Hexahedron"},
                new KeyPair{ Id = 4, Name = "Icosahedron"},
                new KeyPair{ Id = 5, Name = "Dodecahedron"}
            } },
            { 2, new[]{
                new KeyPair{ Id = 6, Name = "Growth"}
            } }
        };
        private readonly ILogger<TestController> _logger;

    }

}
