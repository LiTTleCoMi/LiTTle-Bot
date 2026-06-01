import dotenv from "dotenv";
dotenv.config();

import { Client, GatewayIntentBits, Events, TextChannel, Message, GuildMember } from "discord.js";

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const ids = {
	channels: {
		honeyTrap: "1510070863775666297",
	},
	messages: {},
};

const counterPrefix = "Ban Count: ";

async function getCountMessage(channel: TextChannel): Promise<Message | null> {
	if (!channel.isSendable) return null;

	const messages = await channel.messages.fetch();
	let banCountMessage: Message | null = null;

	for (const message of messages.values()) {
		if (message.author.id === client.user?.id && message.content.startsWith(counterPrefix)) {
			banCountMessage = message;
			break;
		}
	}

	if (!banCountMessage) {
		const createdBanCountMessage = await channel.send(counterPrefix + "0");
		return createdBanCountMessage;
	}

	return banCountMessage;
}

async function incrementBanCount(message: Message): Promise<{ status: "success" | "failed"; message: Message }> {
	if (!message.editable) {
		return { status: "failed", message };
	}

	try {
		let banCount = Number(message.content.split(counterPrefix)[1]);
		banCount++;
		const updatedMessage = await message.edit(counterPrefix + banCount);
		return { status: "success", message: updatedMessage };
	} catch (err) {
		console.log("Failed to increment ban count:", err);
		return { status: "failed", message };
	}
}

async function banMember(member: GuildMember): Promise<{ status: "success" | "failed"; member: GuildMember }> {
	if (!member.bannable) return { status: "failed", member };
	try {
		const bannedMember = await member.ban({ deleteMessageSeconds: 60 * 60, reason: "Honey Trap" });
		return { status: "success", member: bannedMember };
	} catch (err) {
		console.log("Failed to ban member:", err);
		return { status: "failed", member };
	}
}

client.once(Events.ClientReady, async () => {
	const honeyTrapChannel = await client.channels.fetch(ids.channels.honeyTrap);
	if (!honeyTrapChannel?.isTextBased()) return;
	const honeyTrap = honeyTrapChannel as TextChannel;

	const banCountMessage = await getCountMessage(honeyTrap);
	if (!banCountMessage) return;

	client.on(Events.MessageCreate, async (message) => {
		if (message.channelId === ids.channels.honeyTrap) {
			console.log(`${message.author.displayName} said, "${message.content}".`);
			if (message.deletable) {
				await message.delete();
			}
			const guildMember = message.member;
			if (!guildMember) return;
			const banResult = await banMember(guildMember);
			if (banResult.status === "success") {
				await incrementBanCount(banCountMessage);
				console.log(banCountMessage.content);
			}
		}
	});
});

client.login(process.env.DISCORD_TOKEN);
