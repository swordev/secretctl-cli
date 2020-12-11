import { colorize, exec, jsonParseExec } from "./util"
import { SecretConfigInterface, gen } from "./secret"

export interface KubeSecretResourceInterface {
	metadata: {
		name: string
		annotations?: {
			[name: string]: string
		}
	}
	data: {
		[name: string]: string
	}
}

export interface KubeSecretConfigInterface extends SecretConfigInterface {
	key: string
}

export interface KubeSecretInterface {
	resource: KubeSecretResourceInterface
	configs: KubeSecretConfigInterface[]
}

export type FilterType = {
	names?: string[]
	annotationConfigKey?: string
	keyNames?: string[]
	keyData?: boolean
}

export function hasSecretKey(
	resource: KubeSecretResourceInterface,
	key: string
) {
	return typeof resource?.data?.[key] === "string"
}

const defaultConfig: Partial<KubeSecretConfigInterface> = {
	length: 16,
	base64: true,
}

export function parseSecretConfig(input: string): KubeSecretConfigInterface[] {
	if (typeof input !== "string") return null

	let config: KubeSecretConfigInterface[]

	if (/^\[.+\]$/.test(input)) {
		config = JSON.parse(input)
	} else if (/^\{.+\}$/.test(input)) {
		config = [JSON.parse(input)]
	} else {
		config = input.split(",").reduce((result, key) => {
			key = key.trim()
			if (key.length) result.push({ key: key })
			return result
		}, [] as KubeSecretConfigInterface[])
	}

	return config.map((item) => Object.assign({}, defaultConfig, item))
}

export function filterSecrets(options: {
	secrets: {
		items: KubeSecretResourceInterface[]
	}
	parseConfigs?: boolean
	filter: FilterType
}) {
	const result: KubeSecretInterface[] = []

	for (let secret of options.secrets.items) {
		// Filter name

		if (
			options.filter.names &&
			!options.filter.names.includes(secret.metadata.name)
		)
			continue

		let annotationConfig: string

		// Filter annotationKey

		if (options.filter.annotationConfigKey) {
			annotationConfig = secret.metadata?.annotations?.[
				options.filter.annotationConfigKey
			]?.trim()
			if (!annotationConfig?.length) continue
		}

		// Filter keyNames/keyData

		if (
			options.filter.keyNames ||
			typeof options.filter.keyData === "boolean"
		) {
			const newSecret: KubeSecretResourceInterface = {
				data: {},
				metadata: secret.metadata,
			}

			for (const key in secret.data) {
				if (typeof options.filter.keyData === "boolean")
					if (
						typeof options.filter.keyData === "boolean" &&
						options.filter.keyData !== hasSecretKey(secret, key)
					)
						continue
				if (
					options.filter.keyNames &&
					!options.filter.keyNames.includes(key)
				)
					continue

				newSecret.data[key] = secret.data[key]
			}

			secret = newSecret
		}

		// Parse/Filter annotation config

		let configs: KubeSecretConfigInterface[] = null

		if (options.parseConfigs && options.filter.annotationConfigKey) {
			configs = parseSecretConfig(annotationConfig)
			if (options.filter.keyNames)
				configs = configs.filter((config) =>
					options.filter.keyNames.includes(config.key)
				)
		}

		result.push({
			resource: secret,
			configs: configs,
		})
	}

	return result
}

export async function fetchSecrets(options: {
	parseAnnotationConfigs?: boolean
	filter: FilterType
}) {
	const secrets: {
		items: KubeSecretResourceInterface[]
	} = await jsonParseExec("kubectl", ["get", "secret", "-o", "json"])

	return filterSecrets({
		secrets: secrets,
		parseConfigs: options.parseAnnotationConfigs,
		filter: options.filter,
	})
}

export async function generateSecrets(
	secrets: KubeSecretInterface[],
	force?: boolean
) {
	for (const secret of secrets) {
		if (!secret.configs) continue
		const replaceKeys: string[] = []
		const unencodedPasswords: string[] = []
		const dataPatch = secret.configs.reduce((result, config) => {
			if (!force && hasSecretKey(secret.resource, config.key))
				return result

			const [password, encoded] = gen(config)
			if (config.encoding)
				unencodedPasswords.push(
					config.user ? `${config.user}:${password}` : password
				)
			result[config.key] = encoded
			if (hasSecretKey(secret.resource, config.key))
				replaceKeys.push(config.key)
			return result
		}, {})

		if (!Object.keys(dataPatch).length) continue

		if (replaceKeys.length)
			console.warn(
				colorize(
					"red",
					`WARNING! The next secret keys will be replaced: ${replaceKeys.join(
						", "
					)}`
				)
			)

		for (const password of unencodedPasswords)
			console.log(colorize("grey", password))

		await exec(
			"kubectl",
			[
				"patch",
				"secret",
				secret.resource.metadata.name,
				"--type",
				"merge",
				"--patch",
				JSON.stringify({ data: dataPatch }),
			],
			{},
			{
				log: true,
				confirm: true,
			}
		)
	}
}
