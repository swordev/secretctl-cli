import {
	randomTinyint,
	colorize,
	exec,
	jsonParseExec,
	parseStringList,
} from "./../src/util"

beforeEach(() => {
	jest.clearAllMocks()
})

function buildConfirmMessage(text: string) {
	return `${colorize("cyan", "?")} Run ${colorize(
		"yellow",
		text
	)}? ${colorize("grey", "(y/n)")}: `
}

describe(randomTinyint.name, () => {
	it("limits", () => {
		for (let index = 1; index <= 500; index++) {
			const result = randomTinyint(0, 255)
			expect(result).toBeGreaterThanOrEqual(0)
			expect(result).toBeLessThanOrEqual(255)
		}
	})

	it("out of range", () => {
		expect(() => randomTinyint(5, 3)).toThrowError()
		expect(() => randomTinyint(-1, 1)).toThrowError()
		expect(() => randomTinyint(0, 256)).toThrowError()
		expect(() => randomTinyint(0, 0)).toThrowError()
	})
})

describe(parseStringList.name, () => {
	it("basic", () => {
		expect(parseStringList("1,2,3")).toMatchObject(["1", "2", "3"])
		expect(parseStringList("a, b , c")).toMatchObject(["a", "b", "c"])
	})
})

describe(exec.name, () => {
	it("logCommand", async () => {
		const consoleSpy = jest.spyOn(console, "log")

		await exec("echo", ["hello world"], null, {
			logCommand: true,
		})

		expect(consoleSpy).toHaveBeenCalledTimes(1)
		expect(consoleSpy).toHaveBeenCalledWith(
			`+ ${colorize("yellow", "echo hello world")}`
		)
	})

	it("logOutput", async () => {
		const consoleSpy = jest.spyOn(console, "log")
		const writeSpy = jest.spyOn(process.stdout, "write")

		await exec("echo", ["hello world"], null, {
			logOutput: true,
		})

		expect(consoleSpy).toHaveBeenCalledTimes(0)
		expect(writeSpy).toHaveBeenCalledWith(Buffer.from("hello world\n"))
	})

	it("log", async () => {
		const consoleSpy = jest.spyOn(console, "log")
		const writeSpy = jest.spyOn(process.stdout, "write")

		await exec("echo", ["hello world"], null, {
			log: true,
		})

		expect(consoleSpy).toHaveBeenCalledTimes(1)
		expect(consoleSpy).toHaveBeenCalledWith(
			`+ ${colorize("yellow", "echo hello world")}`
		)
		//expect(writeSpy).toHaveBeenCalledTimes(1)
		expect(writeSpy).toHaveBeenCalledWith(Buffer.from("hello world\n"))
	})

	it("confirm yes", async () => {
		const writeSpy = jest.spyOn(process.stdout, "write")

		await exec("echo", ["hello world"], null, {
			confirm: true,
			onCreateInterface: (object) =>
				setImmediate(() => object.write("yes\n")),
		})

		expect(writeSpy).toBeCalledWith(buildConfirmMessage("echo hello world"))
	})

	it("confirm no", async () => {
		const writeSpy = jest.spyOn(process.stdout, "write")

		await exec("echo", ["hello world"], null, {
			confirm: true,
			onCreateInterface: (object) => {
				expect(true).toBeTruthy()
				setImmediate(() => object.write("no\n"))
			},
			onSpawm: () => expect(false).toBeTruthy(),
		})

		expect(writeSpy).toBeCalledWith(buildConfirmMessage("echo hello world"))
	})

	it("confirm fail", async (done) => {
		const writeSpy = jest.spyOn(process.stdout, "write")

		await exec("echo", ["hello world"], null, {
			confirm: true,
			onCreateInterface: (object) =>
				setImmediate(() => {
					object.write("fail\n")
				}),
			onSpawm: () => expect(false).toBeTruthy(),
		})

		expect(writeSpy).toBeCalledWith(buildConfirmMessage("echo hello world"))
		done()
	})
})

describe(jsonParseExec.name, () => {
	it("simple", async () => {
		const result = await jsonParseExec("echo", ['{"a": 1}'])
		expect(result).toMatchObject({ a: 1 })
	})
	it("fail", async () => {
		const result = jsonParseExec("echo", ['{"a": 1'])
		expect(result).rejects.toBeInstanceOf(Error)
	})
})
