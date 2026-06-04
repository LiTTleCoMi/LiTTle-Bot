import { Client, Message, TextChannel, EmbedBuilder, type PartialMessage, type ColorResolvable, AttachmentBuilder, type ReadonlyCollection } from "discord.js";

export enum MessageEvent {
	Create,
	Delete,
	Edit,
}

export class Logging {
	private channelId: string;
	private channel: TextChannel | null = null;

	constructor(channelId: string) {
		this.channelId = channelId;
	}

	public async setup(client: Client): Promise<{ success: boolean }> {
		const channel = await client.channels.fetch(this.channelId);
		if (!channel || !channel.isTextBased()) {
			console.error("Logging setup failed: Channel missing or not text-based.");
			return { success: false };
		}

		this.channel = channel as TextChannel;
		return { success: true };
	}

	public async handleMessageCreate(message: Message) {
		if (message.author.bot) return;

		this.logMessage(message, MessageEvent.Create);
	}

	public async handleMessageDelete(message: Message | PartialMessage) {
		this.logMessage(message, MessageEvent.Delete);
	}

	public async handleMessageEdit(oldMessage: Message | PartialMessage, newMessage: Message) {
		if (newMessage.author.bot) return;

		this.logMessage(newMessage, MessageEvent.Edit, oldMessage);
	}

	public async handleMessageDeleteBulk(messages: ReadonlyCollection<string, Message | PartialMessage>) {
		if (!this.channel || messages.size === 0) return;

		const firstMessage = messages.first()!;
		const channelName = "name" in firstMessage.channel ? firstMessage.channel.name : "Unknown Channel";

		const transcriptLines = messages.map((msg) => {
			const author = msg.author?.username || "Unknown User";
			const content = msg.content || "[No text content/Only attachments]";
			return `[${msg.id}] ${author}: ${content}`;
		});

		const transcriptText = transcriptLines.toReversed().join("\n");

		const attachment = new AttachmentBuilder(Buffer.from(transcriptText, "utf-8"), {
			name: `bulk-delete-${channelName}.txt`,
		});

		const embed = new EmbedBuilder().setColor("#ED4245").setTitle(`Bulk Message Deletion in #${channelName}`).setDescription(`**${messages.size} messages** were bulk deleted.\nA transcript of the text contents is attached below.`).setTimestamp();

		await this.channel.send({ embeds: [embed], files: [attachment] });
	}

	private async logMessage(message: Message | PartialMessage, messageEvent: MessageEvent, oldMessage?: Message | PartialMessage) {
		if (!this.channel) return;
		if (message.channelId === this.channelId) return;
		if (messageEvent === MessageEvent.Create) return;

		const channelName = "name" in message.channel ? message.channel.name : "Unknown Channel";
		let color: ColorResolvable | null = null;
		let title = "";
		let titleUrl: string | null = null;
		let UserId = message.author ? message.author.id : "Unknown";

		if (messageEvent === MessageEvent.Delete) {
			color = "#ED4245";
			title = "Message deleted in #";
		} else if (messageEvent === MessageEvent.Edit) {
			color = "#425eed";
			title = "Message edited in #";
			titleUrl = message.url;
		} else if (messageEvent === MessageEvent.Create) {
			color = "#42ed67";
			title = "Message sent in #";
			titleUrl = message.url;
		}

		title += channelName;

		let attachmentUrls: string[] = [];
		message.attachments.forEach((attachment) => attachmentUrls.push(attachment.url));

		let oldAttachmentUrls: string[] = [];
		oldMessage?.attachments.forEach((attachment) => oldAttachmentUrls.push(attachment.url));

		let description = "";
		if (messageEvent === MessageEvent.Edit && oldMessage) {
			if (oldMessage.content !== message.content) {
				description += "**Before: **" + oldMessage.content + "\n";
				description += "**+After: **" + message.content + "\n\n";
			}
			if (oldAttachmentUrls.length !== attachmentUrls.length) {
				const oldSet = new Set(oldAttachmentUrls);
				const newSet = new Set(attachmentUrls);
				if (oldAttachmentUrls.length > attachmentUrls.length) {
					description += "**Attachments Removed:**\n";
					oldSet.difference(newSet).forEach((url) => (description += url + "\n"));
				} else {
					description += "**Attachments Added:**\n";
					newSet.difference(oldSet).forEach((url) => (description += url + "\n"));
				}
				description += "\n";
      }
      
      if (!description) return; // indicating embed change, dont care about that
		} else if (message.content) {
			description = "**Content:\n**" + message.content + "\n\n";
			if (attachmentUrls.length) description += "**Attachments:\n**" + attachmentUrls.join("\n") + "\n\n";
		}

		description += "Message ID: " + message.id + "\n";
		const footerText = "ID: " + UserId;

		const embed = new EmbedBuilder()
			.setColor(color)
			.setAuthor({
				name: message.author?.username || "",
				iconURL: message.author?.displayAvatarURL() || "",
			})
			.setTitle(title)
			.setURL(titleUrl)
			.setDescription(description)
			.setFooter({
				text: footerText,
			})
			.setTimestamp();

		this.channel.send({ embeds: [embed] });
	}
}
