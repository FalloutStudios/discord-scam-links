import { DiscordScamLinks } from '@falloutstudios/djs-scam-links';

const manager = new DiscordScamLinks();

await manager.fetchJsonFromUrl('https://raw.githubusercontent.com/nikolaischunk/discord-phishing-links/main/domain-list.json', {
    dataParser: data => {
        return data.domains;
    }
});

console.log(manager.isMatch('get free nitro https://wwwvww-roblox.com/eee'));