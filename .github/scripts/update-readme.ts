/**
 * Regenerates the plugin/theme tables in the README, without any marker comments.
 *
 *   bun .github/scripts/update-readme.ts [--readme README.md] [--plugins-dir plugins]...
 *
 * For each directory, the script finds the matching `## <Directory>` heading and replaces
 * everything from that heading up to (but excluding) the next `## ` heading with a table
 * built from each plugin's `manifest.json`. It reads local files only — no index,
 * no network, no GitHub Action.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

interface Manifest {
	id: string
	name: string
	description: string
	author: string
	contributors?: string[]
	version: string
}

const { values } = parseArgs({
	options: {
		readme: { type: 'string', default: 'README.md' },
		'plugins-dir': {
			type: 'string',
			multiple: true,
			default: ['plugins', 'themes'],
		},
	},
})

// Keeps a cell on one line and stops it from ending the column.
const cell = (text: string) =>
	text.replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|')

function table(pluginsDir: string): string {
	if (!existsSync(pluginsDir)) return '_Nothing here yet._'

	const rows = readdirSync(pluginsDir)
		.filter(name => existsSync(`${pluginsDir}/${name}/manifest.json`))
		.map(name => ({
			name,
			manifest: JSON.parse(
				readFileSync(`${pluginsDir}/${name}/manifest.json`, 'utf8'),
			) as Manifest,
		}))
		.filter(({ manifest }) => manifest?.name)
		.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name))

	if (!rows.length) return '_Nothing here yet._'

	return [
		'| Name | Description | Authors | ID | Version |',
		'| --- | --- | --- | --- | --- |',
		...rows.map(({ name, manifest }) => {
			const authors = [manifest.author, ...(manifest.contributors ?? [])]
				.filter(Boolean)
				.join(', ')
			return `| [${cell(manifest.name)}](${pluginsDir}/${name}) | ${cell(
				manifest.description ?? '',
			)} | ${cell(authors)} | \`${cell(manifest.id)}\` | ${manifest.version} |`
		}),
	].join('\n')
}

let readme = readFileSync(values.readme, 'utf8')

for (const pluginsDir of values['plugins-dir']) {
	// "plugins" -> "Plugins", "theme-packs" -> "Theme Packs"
	const title = pluginsDir
		.split('/')
		.filter(Boolean)
		.pop()!
		.split(/[-_]/)
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')

	// Headings may carry an emoji prefix, e.g. `## 🔌 Plugins`.
	const headingText = (line: string) =>
		line
			.replace(/^#{2,6}\s+/, '')
			.replace(/[^\p{L}\p{N}]+/gu, ' ')
			.trim()

	const lines = readme.split('\n')
	const start = lines.findIndex(
		line => line.startsWith('## ') && headingText(line) === title,
	)
	if (start === -1)
		throw new Error(
			`${values.readme}: no "## ${title}" heading found for ${pluginsDir}`,
		)

	// The table owns the section body: everything after the heading until the next `## `.
	let end = start + 1
	while (end < lines.length && !lines[end].startsWith('## ')) end++

	const body = ['', table(pluginsDir), '']
	lines.splice(start + 1, end - start - 1, ...body)
	readme = lines.join('\n')
}

writeFileSync(values.readme, readme)
console.log(`✓ Updated ${values.readme}`)
