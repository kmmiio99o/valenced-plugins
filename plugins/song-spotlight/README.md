# Song Spotlight

Song Spotlight lets you connect to a Song Spotlight server, save up to six supported music links,
and display them on your Discord profile. Profile visitors can open each link or play an available
preview using Discord's native audio player.

The default server is `https://dc.songspotlight.nexpid.xyz/`. You can change the server and OAuth
client ID in the plugin settings. Authorization tokens are stored in this plugin's local JSON
storage, separately for each Discord account. Disconnecting removes the locally stored token;
deleting saved songs removes the server-side list.

Song metadata and previews are resolved by [`@song-spotlight/api`](https://github.com/nexpid-labs/SongSpotlight/tree/main/packages/api)
from supported music providers. The plugin sends the song list to the configured Song Spotlight
server and reads public lists for profile cards.

The source attribution and license notices for the original plugin and API package are in
[`NOTICE.md`](NOTICE.md).
