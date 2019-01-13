using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Pacem.Js.CustomElements.Hubs
{
    public class Lobby : Hub
    {
        public override async Task OnConnectedAsync()
        {
            await Clients.All.SendAsync("SendAction", Context.User.Identity.Name, "joined");
        }



        public override async Task OnDisconnectedAsync(Exception ex)
        {
            await Clients.All.SendAsync("SendAction", Context.User.Identity.Name, "left");
        }



        public async Task Send(string nick, string message)
        {
            await Clients.All.SendAsync("SendMessage", Context.User.Identity.Name ?? nick, message);
        }
    }
}
