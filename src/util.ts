import {
	ChildProcessWithoutNullStreams,
	spawn,
	SpawnOptionsWithoutStdio,
} from "child_process"
import { randomBytes } from "crypto"
import { createInterface, Interface } from "readline"
import { inspect } from "util"

export interface ExecSettingsInterface {
	log?: boolean
	logCommand?: boolean
	logOutput?: boolean
	exec?: boolean
	confirm?: boolean
	onCreateInterface?: (object: Interface) => void
	onSpawm?: (object: ChildProcessWithoutNullStreams) => void
}

export function randomTinyint(min: number, max: number) {
	if (max <= 0) throw new Error(`Max is lower than 0: ${max}`)
	if (min > max) throw new Error(`Min is greater than max: ${min}`)
	if (min < 0) throw new Error(`Invalid min tinyint value: ${min}`)
	if (max > 255) throw new Error(`Invalid max tinyint value: ${max}`)
	const random = parseInt(randomBytes(1).toString("hex"), 16)
	return Math.floor((random / 256) * (max - min + 1) + min)
}

export function parseStringList(value: string) {
	return value.split(",").map((v) => v.trim())
}

export function colorize(color: string, text: string) {
	const codes = inspect.colors[color]
	return `\x1b[${codes[0]}m${text}\x1b[${codes[1]}m`
}

export async function prompt(text: string, rl?: Interface) {
	if (!rl)
		rl = createInterface({
			input: process.stdin,
			output: process.stdout,
		})
	return new Promise<string>((resolve) => {
		rl.question(text, (value: string) => {
			rl.close()
			resolve(value.trim())
		})
	})
}

export async function confirmPrompt(text: string, rl?: Interface) {
	const result = await prompt(
		`${colorize("cyan", "?")} ${text} ${colorize("grey", "(y/n)")}: `,
		rl
	)

	const yesRegex = /^y(es)?$/i
	const noRegex = /^n(o)?$/i
	if (yesRegex.test(result)) {
		return true
	} else if (noRegex.test(result)) {
		return false
	} else {
		return null
	}
}

export async function strictConfirmPrompt(text: string, rl?: Interface) {
	let result: boolean | null
	while (typeof result !== "boolean") result = await confirmPrompt(text, rl)
	return result
}

export async function jsonParseExec(name: string, argv: string[]) {
	const result = await exec(name, argv)
	return JSON.parse(result.stdout)
}

export async function exec(
	name: string,
	argv: string[],
	options?: SpawnOptionsWithoutStdio,
	settings?: ExecSettingsInterface
) {
	const result = {
		exitCode: 0,
		stderr: "",
		stdout: "",
	}

	if (!settings) settings = {}

	const commandLog = colorize("yellow", name + " " + argv.join(" "))

	if (settings.confirm) {
		const rl = createInterface({
			input: process.stdin,
			output: process.stdout,
		})
		if (settings.onCreateInterface) settings.onCreateInterface(rl)
		const confirm = await confirmPrompt(`Run ${commandLog}?`, rl)
		if (!confirm) return
	} else if (settings.log || settings.logCommand) {
		console.log("+ " + commandLog)
	}

	return new Promise<typeof result>((resolve, reject) => {
		const p = spawn(name, argv, options ?? {})
		if (settings.onSpawm) settings.onSpawm(p)
		if (settings.log || settings.logOutput) {
			p.stdout.pipe(process.stdout)
			p.stderr.pipe(process.stderr)
		}
		p.stdout.on("data", (chunk) => (result.stdout += chunk))
		p.stderr.on("data", (chunk) => (result.stderr += chunk))
		p.on("error", (error) => reject(error))
		p.on("close", (code) => {
			result.exitCode = code
			resolve(result)
		})
	})
}
