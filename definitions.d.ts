export interface DiscordAuthData {
	server_id: string;
	channel_id: string;
	salai_token: string;
	name: string;
}

declare global {
	const ADMIN_ID: number;

	const SETTINGS: {
		readonly STABLE_ADDRESS: string;

		readonly TELEGRAM_BOT_TOKEN: string;

		readonly TELEGRAM_REVIEW_CHATS: {
			music_chat: number;
			photo_chat: number;
		};

		readonly TELEGRAM_ERROR_CHAT: number;

		readonly DB_PASSWORD: string;
		readonly DB_NAME: string;
		readonly DB_USERNAME: string;
		readonly DB_HOST: string;

		readonly TEST_BOT: boolean;

		readonly ERROR_CHAT: number;

		readonly OPENAI_API_KEY: string;

		readonly DISCORD_AUTH: DiscordAuthData[];

		readonly SUNO_AUTH: {
			uniq_name: string;
			cookie: string;
			session: string;
		}[];
	};
}

export {};
