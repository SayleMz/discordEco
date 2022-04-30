const { Client, Intents } = require('discord.js');
const { commands } = require('./data/commands');
const { createConnection } = require('mysql');
const config = require('./config.json');
const sqlite = require('sqlite3').verbose();

const client = new Client({ intents: 
	[
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES
	]
});

let con = createConnection(config.database);

con.connect(err => 
	{
		if (err) return console.error(err);
		console.log('Database is up');
	});

client.on('ready', async () =>
{
	await client.guilds.cache.get(guildId).commands.fetch();
	client.guilds.cache.get(guildId).commands.cache.map(command => await command.delete());
	for (let i in commands)
		client.guilds.cache.get(guildId).commands.create(commands[i].data);
	let db = new sqlite.Database('./data/database.db', sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE, err =>
		{
			if (err)
				return console.error(err);
		});
	db.run('CREATE TABLE IF NOT EXISTS users(userid INTEGER PRIMARY KEY, credits INTEGER DEFAULT 0, nick VARCHAR(16))', err => 
		{
			if (err) 
				return console.error(err);
		});
	db.run('CREATE TABLE IF NOT EXISTS servers(serverid INTEGER PRIMARY KEY, shopsize INTEGER DEFAULT 2)', err =>
		{
			if (err)
				return console.error(err);
		});
	db.run('CREATE TABLE IF NOT EXISTS roles(roleid INTEGER PRIMARY KEY, price INTEGER, serverid INTEGER, FOREIGN KEY(serverid) REFERENCES servers(serverid))', err =>
		{
			if (err)
				return console.error(err);
		});
	console.log(`Successfully logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) =>
{
	if (message.author.bot) return;
	const authorId = message.author.id;
	let db = new sqlite.Database('./data/database.db', sqlite.OPEN_READWRITE);
	db.get('SELECT * FROM users WHERE userid = ?', [authorId], (err, row) =>
		{
			if (err) return console.error(err);
			if (row === undefined)
			{
				let insertData = db.prepare('INSERT INTO users VALUES(?, ?, ?)');
				insertData.run(authorId, message.content.length, message.author.username.slice(0, 16));
				insertData.finalize();
			}
			else
			{
				let updateData = db.prepare('UPDATE users SET credits = credits + ? WHERE userid = ?');
				updateData.run(message.content.length, authorId);
				updateData.finalize();
			}
		});
});

client.on('interactionCreate', (interaction) =>
{
	if (!interaction.isCommand()) 
		return;
	commands[interaction.commandName].execute(interaction);
});

client.login(config.client.token);