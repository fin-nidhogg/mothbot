const { MongoClient } = require('mongodb');

// MongoDB yhteysasetukset
const mongoUri = 'mongodb://nidhogg:proteus280488@apkio.fi:27017/?authMechanism=SCRAM-SHA-256&authSource=admin';
const dbName = process.env.NODE_ENV === 'production' ? 'mothbot' : 'mothbot_stag';
const collectionName = 'message_stats';

// MongoDB yhteys
async function connectMongo() {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(dbName);
    return db.collection(collectionName);
}

// Viestihistorian hakeminen ja tallentaminen MongoDB:hen
async function handleFetchMessages(message) {
    const messagesCollection = await connectMongo();

    // Käy läpi kaikki guildit
    message.client.guilds.cache.forEach(async (guild) => {
        console.log(`Käydään läpi guildia: ${guild.name}`);

        // Käy läpi kaikki kanavat
        guild.channels.cache.forEach(async (channel) => {
            if (channel.isTextBased()) {
                let messages = [];
                let lastMessageId = null;

                // Hae viestihistoria
                do {
                    const fetchedMessages = await channel.messages.fetch({
                        limit: 100,
                        before: lastMessageId,
                    });

                    if (fetchedMessages.size === 0) {
                        break;
                    }

                    messages = [...messages, ...fetchedMessages.map(msg => msg)];
                    lastMessageId = fetchedMessages.last().id;
                } while (messages.length < 1000); // Rajoittaa viestien määrää

                // Käy viestit läpi ja luo tai päivitä dokumentit MongoDB:ssä
                for (const msg of messages) {
                    const dateString = msg.createdAt.toISOString().split('T')[0].replace(/-/g, '');
                    const date = new Date(msg.createdAt.toISOString().split('T')[0]);

                    const document = {
                        channelId: channel.id,
                        guildId: guild.id,
                        userId: msg.author.id,
                        dateString,
                        channelName: channel.name,
                        nickname: msg.member ? msg.member.displayName : null,
                        username: msg.author.username,
                        messageCount: 1, // Asetetaan oletusarvo
                        date, // Set date to ISO format
                    };

                    // Tarkista, onko dokumentti jo olemassa
                    const existingDoc = await messagesCollection.findOne({
                        channelId: document.channelId,
                        userId: document.userId,
                        dateString: document.dateString,
                    });

                    if (existingDoc) {
                        // Jos dokumentti löytyy, päivitetään messageCount
                        await messagesCollection.updateOne(
                            { _id: existingDoc._id },
                            { $inc: { messageCount: 1 } }
                        );
                    } else {
                        // Jos dokumenttia ei löydy, luodaan uusi
                        await messagesCollection.insertOne(document);
                    }
                }
            }
        });
    });
}

module.exports = { handleFetchMessages };