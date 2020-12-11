import { createHash } from "crypto"
import { buildCharset, gen, randomString } from "./../src/secret"

describe(buildCharset.name, () => {
	it("invalid charset type", () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(() => buildCharset(["error" as any])).toThrowError()
	})

	it("empty charset types", () => {
		expect(() => buildCharset([])).toThrowError()
	})

	it("lc", () => {
		expect(buildCharset(["lc"])).toMatch("abcdefghijklmnopqrstuvwxyz")
	})

	it("uc", () => {
		expect(buildCharset(["uc"])).toMatch("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
	})

	it("digit", () => {
		expect(buildCharset(["digit"])).toMatch("0123456789")
	})

	it("special", () => {
		expect(buildCharset(["special"])).toMatch("!$%&-_")
	})

	it("lc+uc", () => {
		expect(buildCharset(["lc", "uc"])).toMatch(
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
		)
	})

	it("uc+uc+digit", () => {
		expect(buildCharset(["lc", "uc", "digit"])).toMatch(
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
		)
	})

	it("uc+uc+digit+special", () => {
		expect(buildCharset(["lc", "uc", "digit", "special"])).toMatch(
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!$%&-_"
		)
	})
})

describe(randomString.name, () => {
	it("empty charset", () => {
		expect(() => randomString("", 15)).toThrowError()
	})

	it("lc", () => {
		const charset = buildCharset(["lc"])
		for (let index = 1; index <= 500; index++) {
			const result = randomString(charset, 15)
			expect(result.length).toEqual(15)
			expect(
				result.replace(/[abcdefghijklmnopqrstuvwxyz]/g, "").length
			).toEqual(0)
		}
	})

	it("digit", () => {
		const charset = buildCharset(["digit"])
		for (let index = 1; index <= 500; index++) {
			const result = randomString(charset, 15)
			expect(result.length).toEqual(15)
			expect(result.replace(/[0123456789]/g, "").length).toEqual(0)
		}
	})
})
describe(gen.name, () => {
	it("result", () => {
		const genResult = gen({
			length: 8,
		})
		expect(Array.isArray(genResult)).toBeTruthy()
		expect(genResult.length).toBe(2)
		expect(typeof genResult[0]).toBe("string")
		expect(typeof genResult[1]).toBe("string")
	})

	it("min length ", () => {
		expect(() =>
			gen({
				length: 7,
			})
		).toThrowError()
	})

	it("bad length ", () => {
		expect(() =>
			gen({
				length: null,
			})
		).toThrowError()
	})
	it("length 8", () => {
		const [password, result] = gen({
			length: 8,
		})
		expect(password.length).toBe(8)
		expect(result.length).toBe(8)
		expect(password).toEqual(result)
	})

	it("length 13", () => {
		const [password, result] = gen({
			length: 13,
		})
		expect(password.length).toBe(13)
		expect(result.length).toBe(13)
		expect(password).toEqual(result)
	})

	it("user", () => {
		const [password, result] = gen({
			user: "foo",
			length: 9,
		})
		expect(password.length).toBe(9)
		expect(result).toEqual(`foo:${password}`)
	})

	it("htpasswd-sha1 encoding", () => {
		const [password, result] = gen({
			user: "foo",
			encoding: "htpasswd-sha1",
			length: 17,
		})

		const hash = createHash("sha1").update(password).digest("base64")

		expect(password.length).toBe(17)
		expect(result).toEqual(`foo:{SHA}${hash}`)
	})
})
