using Newtonsoft.Json;
using System.Collections.Generic;

namespace Pacem.Js.CustomElements.Models
{
    public class MenuPackage
    {
        [JsonProperty("package")]
        public string Name { get; set; }
        public string Label { get; set; }
        public IEnumerable<MenuItem> Items { get; set; }

    }
}
