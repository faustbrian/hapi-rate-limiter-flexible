import { isListed } from "./helpers";


test("#isListed", () => {
	expect(isListed("127.0.0.1", ["127.*"])).toBe(true);
	expect(isListed("123.0.0.1", ["127.*"])).toBe(false);
});
