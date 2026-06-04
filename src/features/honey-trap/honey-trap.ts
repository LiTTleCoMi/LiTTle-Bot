import { Client, Message, TextChannel, GuildMember } from "discord.js";

export class HoneyTrap {
	private channelId: string;
	private banCountMessage: Message | null = null;
	private counterPrefix = "Ban Count: ";

	constructor(channelId: string) {
		this.channelId = channelId;
	}

	public async setup(client: Client): Promise<{ success: boolean }> {
		const channel = await client.channels.fetch(this.channelId);
		if (!channel || !channel.isTextBased()) {
			console.error("Honey Trap setup failed: Channel missing or not text-based.");
			return { success: false };
		}

		this.banCountMessage = await this.getBanCountMessage(channel as TextChannel, client.user?.id);
		return { success: true };
	}

	public async handleMessage(message: Message) {
    if (message.author.bot) return;
    if (message.channelId !== this.channelId) return;

		if (message.deletable) {
			await message.delete().catch(() => null);
		}

		const guildMember = message.member;
		if (!guildMember) return;

		const banResult = await this.banMember(guildMember);

		if (banResult.success && this.banCountMessage) {
			await this.incrementBanCount();
		}
	}

	private async getBanCountMessage(channel: TextChannel, botId?: string): Promise<Message | null> {
		if (!channel.isSendable) return null;

		const messages = await channel.messages.fetch();
		let banCountMessage: Message | null = null;

		for (const message of messages.values()) {
			if (message.author.id === botId && message.content.startsWith(this.counterPrefix)) {
				banCountMessage = message;
				break;
			}
		}

		if (!banCountMessage) {
			const createdBanCountMessage = await channel.send(this.counterPrefix + "0");
			return createdBanCountMessage;
		}

		return banCountMessage;
	}

	private async incrementBanCount() {
		if (!this.banCountMessage || !this.banCountMessage.editable) return;

		try {
			let banCount = Number(this.banCountMessage.content.split(this.counterPrefix)[1]);
			banCount++;
			this.banCountMessage = await this.banCountMessage.edit(this.counterPrefix + banCount);
		} catch (err) {
			console.error("Failed to increment ban count:", err);
		}
	}

	private async banMember(member: GuildMember): Promise<{ success: boolean }> {
		if (!member.guild.members.me) {
			await member.guild.members.fetch(member.client.user!.id);
		}

		if (!member.bannable) return { success: false };

		try {
			await member.ban({ deleteMessageSeconds: 60 * 60, reason: "Honey Trap" });
			return { success: true };
		} catch (err) {
			return { success: false };
		}
	}
}
