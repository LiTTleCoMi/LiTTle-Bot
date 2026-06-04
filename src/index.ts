import dotenv from "dotenv";
dotenv.config();

import { Client, GatewayIntentBits, Events, TextChannel, Message, GuildMember } from "discord.js";
import { HoneyTrap } from "./features/honey-trap/honey-trap.js";
import { Logging } from "./features/logging/logging.js";

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const ids = {
	channels: {
		honeyTrap: "1510070863775666297",
		logging: "1511829313605865756",
	},
	messages: {},
};

// setup

const honeyTrap = new HoneyTrap(ids.channels.honeyTrap);
let honeyTrapEnabled = false;

const logging = new Logging(ids.channels.logging);
let loggingEnabled = false;

client.once(Events.ClientReady, async () => {
	honeyTrapEnabled = (await honeyTrap.setup(client)).success;
	loggingEnabled = (await logging.setup(client)).success
});

// do stuff

client.on(Events.MessageCreate, async (message) => {
	if (honeyTrapEnabled) {
		await honeyTrap.handleMessage(message);
	}
	if (loggingEnabled) {
		await logging.handleMessageCreate(message);
	}
});

client.on(Events.MessageDelete, async (message) => {
	if (loggingEnabled) {
		await logging.handleMessageDelete(message);
	}
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
	if (loggingEnabled) {
		await logging.handleMessageEdit(oldMessage, newMessage);
	}
});

client.on(Events.MessageBulkDelete, async (messages) => {
	if (loggingEnabled) { 
		logging.handleMessageDeleteBulk(messages);
	}
})


client.login(process.env.DISCORD_TOKEN);
