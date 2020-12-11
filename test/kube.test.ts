import {
	filterSecrets,
	hasSecretKey,
	KubeSecretConfigInterface,
	KubeSecretResourceInterface,
	parseSecretConfig,
} from "./../src/kube"

describe(hasSecretKey.name, () => {
	it("thruthy", () => {
		expect(
			hasSecretKey(
				{
					metadata: null,
					data: {
						key: "",
					},
				},
				"key"
			)
		).toBeTruthy()

		expect(
			hasSecretKey(
				{
					metadata: null,
					data: {
						key2: "secret value",
					},
				},
				"key2"
			)
		).toBeTruthy()
	})

	it("falsy", () => {
		expect(hasSecretKey(null, "key")).toBeFalsy()
		expect(hasSecretKey({ metadata: null, data: null }, "key")).toBeFalsy()

		expect(
			hasSecretKey(
				{
					metadata: null,
					data: {
						key: null,
					},
				},
				"key"
			)
		).toBeFalsy()

		expect(
			hasSecretKey(
				{
					metadata: null,
					data: {
						key: "secret value",
					},
				},
				"key2"
			)
		).toBeFalsy()
	})
})

describe(parseSecretConfig.name, () => {
	it("single key", () => {
		expect(parseSecretConfig("{key]")).toMatchObject([
			{
				key: "{key]",
			},
		] as KubeSecretConfigInterface[])
	})

	it("multiple keys", () => {
		expect(parseSecretConfig("key1, ,[key_2 , {key.3]")).toMatchObject([
			{
				key: "key1",
			},
			{
				key: "[key_2",
			},
			{
				key: "{key.3]",
			},
		] as KubeSecretConfigInterface[])
	})
	it("empty", () => {
		expect(parseSecretConfig("")).toMatchObject(
			[] as KubeSecretConfigInterface[]
		)
		expect(parseSecretConfig(null)).toBeNull()
	})

	it("json object", () => {
		expect(
			parseSecretConfig(
				JSON.stringify({
					key: "key",
					base64: true,
					length: 9,
				} as KubeSecretConfigInterface)
			)
		).toMatchObject([
			{
				key: "key",
				base64: true,
				length: 9,
			},
		] as KubeSecretConfigInterface[])
	})

	it("json array", () => {
		expect(
			parseSecretConfig(
				JSON.stringify([
					{
						key: "key",
						base64: true,
						length: 9,
					},
					{
						key: "key2",
						length: 15,
					},
				] as KubeSecretConfigInterface[])
			)
		).toMatchObject([
			{
				key: "key",
				base64: true,
				length: 9,
			},
			{
				key: "key2",
				length: 15,
			},
		] as KubeSecretConfigInterface[])
	})

	it("json error", () => {
		expect(() => parseSecretConfig("[key: 'error']")).toThrowError()
	})
})

describe(filterSecrets.name, () => {
	const secrets: KubeSecretResourceInterface[] = [
		{
			metadata: {
				name: "secret1",
			},
			data: {},
		},
		{
			metadata: {
				name: "secret2",
				annotations: {
					config: "key1, key3",
				},
			},
			data: {
				key1: "value1",
				key2: "value2",
			},
		},
		{
			metadata: {
				name: "secret3",
			},
			data: {
				key2: "value2",
			},
		},
	]

	it("all", () => {
		expect(
			filterSecrets({
				secrets: {
					items: secrets,
				},
				filter: {},
			})
		).toMatchObject([
			{
				configs: null,
				resource: secrets[0],
			},
			{
				configs: null,
				resource: secrets[1],
			},
			{
				configs: null,
				resource: secrets[2],
			},
		] as ReturnType<typeof filterSecrets>)
	})

	it("filter name", () => {
		expect(
			filterSecrets({
				secrets: {
					items: secrets,
				},
				filter: {
					names: ["secret2"],
				},
			})
		).toMatchObject([
			{
				configs: null,
				resource: secrets[1],
			},
		] as ReturnType<typeof filterSecrets>)
	})

	it("filter names", () => {
		expect(
			filterSecrets({
				secrets: {
					items: secrets,
				},
				filter: {
					names: ["secret2", "secret3"],
				},
			})
		).toMatchObject([
			{
				configs: null,
				resource: secrets[1],
			},
			{
				configs: null,
				resource: secrets[2],
			},
		] as ReturnType<typeof filterSecrets>)
	})

	it("filter keyName", () => {
		expect(
			filterSecrets({
				secrets: {
					items: secrets,
				},
				filter: {
					keyNames: ["key1"],
				},
			})
		).toMatchObject([
			{
				configs: null,
				resource: secrets[0],
			},
			{
				configs: null,
				resource: {
					data: {
						key1: secrets[1].data["key1"],
					},
					metadata: secrets[1].metadata,
				},
			},
			{
				configs: null,
				resource: {
					data: {},
					metadata: secrets[2].metadata,
				},
			},
		] as ReturnType<typeof filterSecrets>)
	})

	it("filter keyData true", () => {
		expect(
			filterSecrets({
				secrets: {
					items: secrets,
				},
				filter: {
					annotationConfigKey: "config",
				},
			})
		).toMatchObject([
			{
				configs: null,
				resource: secrets[1],
			},
		] as ReturnType<typeof filterSecrets>)
	})

	it("parseConfigs", () => {
		expect(
			filterSecrets({
				secrets: {
					items: secrets,
				},
				parseConfigs: true,
				filter: {
					annotationConfigKey: "config",
				},
			})
		).toMatchObject([
			{
				configs: [
					{
						key: "key1",
					},
					{
						key: "key3",
					},
				],
				resource: secrets[1],
			},
		] as ReturnType<typeof filterSecrets>)
	})

	it("filter keyData true", () => {
		expect(
			filterSecrets({
				secrets: {
					items: secrets,
				},
				parseConfigs: true,
				filter: {
					annotationConfigKey: "config",
					keyData: true,
				},
			})
		).toMatchObject([
			{
				configs: [
					{
						key: "key1",
					},
					{
						key: "key3",
					},
				],
				resource: secrets[1],
			},
		] as ReturnType<typeof filterSecrets>)
	})

	it("filter keyData false", () => {
		expect(
			filterSecrets({
				secrets: {
					items: secrets,
				},
				parseConfigs: true,
				filter: {
					annotationConfigKey: "config",
					keyData: false,
				},
			})
		).toMatchObject([
			{
				configs: [
					{
						key: "key1",
					},
					{
						key: "key3",
					},
				],
				resource: {
					metadata: secrets[1].metadata,
					data: {},
				},
			},
		] as ReturnType<typeof filterSecrets>)
	})
})
