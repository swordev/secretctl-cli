#!/usr/bin/env node
import { program } from "commander"
import { fetchSecrets, generateSecrets, hasSecretKey } from "./kube"
import { gen, SecretConfigInterface } from "./secret"
import { SecretError } from "./SecretError"
import { colorize, parseStringList } from "./util"

const kubeAnnotationCofigKey = "git.io/gen-secret"

export type GenOptionsType = {
	encoding: SecretConfigInterface["encoding"]
	length: number
	user: string
	base64: boolean
}

export type KubeGenType = {
	names: string[]
	keys: string[]
	annotationConfigKey: string
	force: boolean
}

export type KubeCheckGenType = {
	names: string[]
	keys: string[]
	annotationConfigKey: string
}

export type KubeGetGen = {
	names: string[]
	keys: string[]
	annotationConfigKey: string
	showValue: boolean
}

export type KubeGet = {
	names: string[]
	keys: string[]
	showValue: boolean
}

program
	.command("gen")
	.description("Generates secret")
	.option("-e, --encoding <value>", "Encoding (htpasswd-sha1)")
	.option("-b, --base64")
	.option<number>(
		"-l, --length <values>",
		"Secret length",
		(v) => Number(v),
		16
	)
	.option("-u, --user <user>", "User")
	.action(
		onCommandAction(async (options: GenOptionsType) => {
			const [password, result] = gen({
				encoding: options.encoding,
				length: options.length,
				user: options.user,
				base64: options.base64,
			})

			console.log(colorize("yellow", result))

			if (options.encoding) console.log(colorize("grey", password))
		})
	)

program
	.command("kube-gen")
	.description("Generates kubernetes secret keys")
	.option<string[]>(
		"-n, --names <values>",
		"Secret names",
		parseStringList,
		null
	)
	.option<string[]>(
		"-k, --keys <values>",
		"Secret keys",
		parseStringList,
		null
	)
	.option(
		"-a, --annotationConfigKey <value>",
		"Annotation config key",
		kubeAnnotationCofigKey
	)
	.option("-f, --force")
	.action(
		onCommandAction(async (options: KubeGenType) => {
			const secrets = await fetchSecrets({
				parseAnnotationConfigs: true,
				filter: {
					names: options.names,
					keyNames: options.keys,
					annotationConfigKey: options.annotationConfigKey,
					data: options.force ? null : false,
				},
			})
			await generateSecrets(secrets)
			if (!secrets.length)
				console.log(colorize("grey", "No secrets found"))
		})
	)

program
	.command("kube-check-gen")
	.description("Checks generated kubernetes secret keys")
	.option<string[]>(
		"-n, --names <values>",
		"Secret names",
		parseStringList,
		null
	)
	.option<string[]>(
		"-k, --keys <values>",
		"Secret keys",
		parseStringList,
		null
	)
	.option(
		"-a, --annotationConfigKey <value>",
		"Annotation config key",
		kubeAnnotationCofigKey
	)
	.action(
		onCommandAction(async (options: KubeCheckGenType) => {
			const secrets = await fetchSecrets({
				parseAnnotationConfigs: true,
				filter: {
					names: options.names,
					keyNames: options.keys,
					annotationConfigKey: options.annotationConfigKey,
				},
			})

			for (const secret of secrets) {
				for (const config of secret.configs || []) {
					const fullSecretKey = `${secret.resource.metadata.name}/${config.key}`
					const exists = hasSecretKey(secret.resource, config.key)
					if (exists) {
						console.log(colorize("green", "✓"), fullSecretKey)
					} else {
						console.log(colorize("red", "⨯"), fullSecretKey)
					}
				}
			}

			if (!secrets.length)
				console.log(colorize("grey", "No secrets found"))
		})
	)

program
	.command("kube-get-gen")
	.description("Gets generated kubernetes secret keys")
	.option<string[]>(
		"-n, --names <values>",
		"Secret names",
		parseStringList,
		null
	)
	.option<string[]>(
		"-k, --keys <values>",
		"Secret keys",
		parseStringList,
		null
	)
	.option(
		"-a, --annotationConfigKey <value>",
		"Annotation config key",
		kubeAnnotationCofigKey
	)
	.option("-s, --showValue", "Shows secret data value")
	.action(
		onCommandAction(async (options: KubeGetGen) => {
			const secrets = await fetchSecrets({
				parseAnnotationConfigs: true,
				filter: {
					names: options.names,
					keyNames: options.keys,
					annotationConfigKey: options.annotationConfigKey,
				},
			})
			for (const secret of secrets) {
				for (const config of secret.configs || []) {
					const fullSecretKey = `${secret.resource.metadata.name}/${config.key}`
					console.log(colorize("yellow", fullSecretKey))
					if (options.showValue) {
						const value = secret.resource.data?.[config.key]
						if (typeof value === "string")
							console.log(Buffer.from(value, "base64").toString())
					}
				}
			}

			if (!secrets.length)
				console.log(colorize("grey", "No secrets found"))
		})
	)

program
	.command("kube-get")
	.description("Gets secret keys")
	.option<string[]>(
		"-n, --names <values>",
		"Secret names",
		parseStringList,
		null
	)
	.option<string[]>(
		"-k, --keys <values>",
		"Secret keys",
		parseStringList,
		null
	)
	.option("-s, --showValue", "Shows secret data value")
	.action(
		onCommandAction(async (options: KubeGet) => {
			const secrets = await fetchSecrets({
				filter: {
					names: options.names,
					keyNames: options.keys,
				},
			})

			for (const secret of secrets) {
				for (const key in secret.resource.data) {
					const fullSecretKey = `${secret.resource.metadata.name}/${key}`
					console.log(colorize("yellow", fullSecretKey))
					if (options.showValue) {
						const value = secret.resource.data?.[key]
						if (typeof value === "string")
							console.log(Buffer.from(value, "base64").toString())
					}
				}
			}

			if (!secrets.length)
				console.log(colorize("grey", "No secrets found"))
		})
	)

program.parse(process.argv)

function onCommandAction(cb: (options: unknown) => Promise<void>) {
	return async function (options: unknown) {
		try {
			await cb(options)
		} catch (error) {
			const e: Error = error
			let text: string
			if (error instanceof SecretError) {
				text = e.message
			} else {
				text = e.stack
			}
			console.error(colorize("red", text))
			process.exit(1)
		}
	}
}
