import { getModules, lookupModule } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'

interface EmojiUploadRequest {
	url: string
	body: { image: string; name: string; roles: string[] }
	headers: null
	context: null
	oldFormErrors: true
	rejectWithError: true
}

interface DiscordHttp {
	HTTP: {
		post(request: EmojiUploadRequest): Promise<{ body: unknown }>
	}
}

interface DiscordEndpoints {
	Endpoints: {
		GUILD_EMOJIS(guildId: string): string
	}
}

let http: DiscordHttp['HTTP'] | undefined
let guildEmojiEndpoint:
	| DiscordEndpoints['Endpoints']['GUILD_EMOJIS']
	| undefined

export function findEmojiUploadModules() {
	return [
		() => {
			http = undefined
			guildEmojiEndpoint = undefined
		},
		getModules(withProps<DiscordHttp>('HTTP'), exports => {
			http = exports.HTTP
		}),
		getModules(withProps<DiscordEndpoints>('Endpoints'), exports => {
			guildEmojiEndpoint = exports.Endpoints.GUILD_EMOJIS
		}),
	]
}

export async function uploadGuildEmoji(
	guildId: string,
	image: string,
	name: string,
) {
	http ??= lookupModule(withProps<DiscordHttp>('HTTP'))[0]?.HTTP
	guildEmojiEndpoint ??= lookupModule(
		withProps<DiscordEndpoints>('Endpoints'),
	)[0]?.Endpoints.GUILD_EMOJIS

	if (!http || !guildEmojiEndpoint) {
		throw new Error('Discord emoji upload API is unavailable.')
	}

	return http.post({
		url: guildEmojiEndpoint(guildId),
		body: { image, name, roles: [] },
		headers: null,
		context: null,
		oldFormErrors: true,
		rejectWithError: true,
	})
}
