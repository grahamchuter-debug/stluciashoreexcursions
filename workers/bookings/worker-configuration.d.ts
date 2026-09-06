/* eslint-disable */
// St Lucia bookings Worker env bindings (Phase 12D).
interface __BaseEnv_Env {
	DB: D1Database;
	PAYMENTS_MODE: string;
	BOOKINGS_ENABLED: string;
	EMAIL_SENDING_ENABLED: string;
	EMAIL_FROM: string;
	EMAIL_FROM_NAME: string;
	EMAIL_REPLY_TO?: string;
	/** Applied only when PAYMENTS_MODE=test — never in live. */
	TEST_ONLY_EMAIL_OVERRIDE?: string;
	CORS_ALLOWED_ORIGINS: string;
	SITE_BASE_URL: string;
	ORIGINATING_SITE: string;
	ORIGINATING_PORT: string;
	OPERATOR_PORTAL_BASE_URL?: string;
	LIVE_PAYMENTS_UNLOCK?: string;
	STRIPE_SECRET_KEY: string;
	STRIPE_WEBHOOK_SECRET: string;
	OPERATOR_TEST_TOKEN: string;
	OPERATOR_TOKEN?: string;
	RESEND_API_KEY?: string;
}
declare namespace Cloudflare {
	interface GlobalProps {
		mainModule: typeof import("./src/index");
	}
	interface Env extends __BaseEnv_Env {}
}
interface Env extends __BaseEnv_Env {}
type StringifyValues<EnvType extends Record<string, unknown>> = {
	[Binding in keyof EnvType]: EnvType[Binding] extends string ? EnvType[Binding] : string;
};
declare namespace NodeJS {
	interface ProcessEnv extends StringifyValues<Pick<Cloudflare.Env, "PAYMENTS_MODE" | "CORS_ALLOWED_ORIGINS" | "SITE_BASE_URL" | "ORIGINATING_SITE" | "ORIGINATING_PORT" | "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET" | "OPERATOR_TEST_TOKEN">> {}
}
