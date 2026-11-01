import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'

interface NativeSound {
	play(): void
	stop(): void
	ensureSound?(): Promise<unknown>
}

interface SoundModule {
	MobileAudioSound: new (
		url: string,
		name: string,
		volume: number,
		outputChannel: string,
		isNative?: boolean,
	) => NativeSound
}

let Sound: SoundModule['MobileAudioSound'] | undefined
let activeSound: NativeSound | undefined
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<(url: string | null) => void>()

function notify(url: string | null) {
	for (const listener of listeners) listener(url)
}

export function subscribeToAudio(listener: (url: string | null) => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function findAudioModule() {
	return getModules(withProps<SoundModule>('MobileAudioSound'), module => {
		Sound = module.MobileAudioSound
	})
}

export function stopPreview() {
	if (timer) clearTimeout(timer)
	timer = undefined
	activeSound?.stop()
	activeSound = undefined
	notify(null)
}

export async function playPreview(url: string, durationMs?: number) {
	stopPreview()
	if (!Sound) throw new Error('Discord audio playback is unavailable.')

	const sound = new Sound(url, 'vibing_wumpus', 0.4, 'default', false)
	activeSound = sound
	notify(url)

	try {
		if (sound.ensureSound) await sound.ensureSound()
		if (activeSound !== sound) return
		sound.play()
		if (durationMs && durationMs > 0) {
			timer = setTimeout(() => {
				if (activeSound === sound) stopPreview()
			}, durationMs)
		}
	} catch (error) {
		if (activeSound === sound) stopPreview()
		throw error
	}
}
