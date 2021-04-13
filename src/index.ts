import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";
import {
	RateLimiterMemory,
	RLWrapperBlackAndWhite,
} from "rate-limiter-flexible";

import { config } from "./config";
import { RateLimitResult } from "./contracts";
import { isListed } from "./helpers";

export const plugin = {
	name: "hapi-rate-limiter-flexible",
	version: "1.0.0",
	once: true,
	register(
		server: Hapi.Server,
		options: {
			enabled: boolean;
			points: number;
			duration: number;
			whitelist: string[];
			blacklist: string[];
		}
	): void {
		config.load(options);

		if (config.hasError()) {
			throw config.getError();
		}

		if (config.get("enabled") === false) {
			return;
		}

		const rateLimiter = new RLWrapperBlackAndWhite({
			limiter: new RateLimiterMemory({
				points: config.get("points"),
				duration: config.get("duration"),
			}),
			whiteList: config.get("whitelist") || ["*"],
			blackList: config.get("blacklist") || [],
			isWhiteListed: (ip: string): boolean =>
				isListed(ip, config.get("whitelist")),
			isBlackListed: (ip: string): boolean =>
				isListed(ip, config.get("blacklist")),
			runActionAnyway: false,
		});

		server.ext({
			type: "onPostAuth",
			async method(request, h) {
				try {
					const result: RateLimitResult = await rateLimiter.consume(
						request.info.remoteAddress,
						1
					);

					// @ts-ignore
					request.headers["Retry-After"] = result.msBeforeNext / 1000;
					request.headers["X-RateLimit-Limit"] = config.get("points");
					// @ts-ignore
					request.headers["X-RateLimit-Remaining"] = result.remainingPoints;
					// @ts-ignore
					request.headers["X-RateLimit-Reset"] = new Date(
						Date.now() + result.msBeforeNext
					);
				} catch (error) {
					if (error instanceof Error) {
						return Boom.internal(error.message);
					}

					const tooManyRequests = Boom.tooManyRequests();
					tooManyRequests.output.headers["Retry-After"] = `${
						Math.round(error.msBeforeNext / 1000) || 1
					}`;

					return tooManyRequests;
				}

				return h.continue;
			},
		});
	},
};
