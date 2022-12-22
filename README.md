# @falloutstudios/djs-scam-links

Check if string for contains scam domains.

## Example

```js
const { Client } = require('discord.js');
const { DiscordScamLinks } = require('@falloutstudios/djs-scam-links');

const client = new Client({
    intents: [
        'Guilds',
        'GuildMessages',
        'MessageContent'
    ]
});

const scamLinks = new DiscordScamLinks();

client.on('ready', async () => {
    await scamLinks.refreshDomains();
});

client.on('messageCreate', async message => {
    if (scamLinks.isMatch(message.content)) await message.delete();
});

client.login('TOKEN');
```