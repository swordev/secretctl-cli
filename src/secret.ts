import { createHash } from "crypto"
import { SecretError } from "./SecretError"
import { randomTinyint } from "./util"

export type CharsetType = "lc" | "uc" | "digit" | "special"
export interface SecretConfigInterface {
	user?: string
	length?: number
	encoding?: "htpasswd-sha1"
	charsetTypes?: CharsetType[]
	base64?: boolean
}

export function buildCharset(types: CharsetType[]) {
	if (!types.length) throw new SecretError(`Charset types are empty`)
	let charset = ""
	for (const type of types) {
		if (type === "lc") {
			charset += "abcdefghijklmnopqrstuvwxyz"
		} else if (type === "uc") {
			charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
		} else if (type === "digit") {
			charset += "0123456789"
		} else if (type === "special") {
			charset += "!$%&-_"
		} else {
			throw new SecretError(`Invalid charset type: ${type}`)
		}
	}
	return charset
}

export function randomString(charset: string, length: number) {
	if (length <= 0)
		throw new SecretError(`Invalid random string length: ${length}`)
	let result = ""
	for (let index = 0; index < length; ++index) {
		const randomIndex = randomTinyint(0, charset.length - 1)
		result += charset[randomIndex]
	}
	return result
}

export function gen(data: SecretConfigInterface): [string, string] {
	let result = ""

	if (typeof data.user === "string") result += `${data.user}:`

	if (typeof data.length !== "number" || data.length < 8)
		throw new SecretError(`Min length allowed is 8`)

	const length = data.length ?? 16
	const charsetTypes = data.charsetTypes ?? ["lc", "uc", "digit", "special"]
	const charset = buildCharset(charsetTypes)
	const password = randomString(charset, length)

	if (data.encoding === "htpasswd-sha1") {
		result += "{SHA}" + createHash("sha1").update(password).digest("base64")
	} else if (data.encoding) {
		throw new SecretError(`Invalid encoding: ${data.encoding}`)
	} else {
		result += password
	}

	if (data.base64) result = Buffer.from(result).toString("base64")

	return [password, result]
}
