const { MongoClient } = require('mongodb');

// MongoDB connection settings
const mongoUri = 'mongodb://nidhogg:proteus280488@apkio.fi:27017/?authMechanism=SCRAM-SHA-256&authSource=admin';
const dbName = process.env.NODE_ENV === 'production' ? 'mothbot' : 'mothbot_stag';
const collectionName = 'message_stats';

// MongoDB connection
async function connectMongo() {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(dbName);
    return db.collection(collectionName);
}

// Fetch message history and store it in MongoDB
async function handleFetchMessages(message) {
    const messagesCollection = await connectMongo();

    // Iterate through all guilds
    message.client.guilds.cache.forEach(async (guild) => {
        console.log(`Processing guild: ${guild.name}`);

        // Iterate through all channels
        guild.channels.cache.forEach(async (channel) => {
            if (channel.isTextBased()) {
                try {
                    let messages = [];
                    let lastMessageId = null;

                    // Fetch message history
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
                    } while (lastMessageId); // Continue until there are no more messages

                    // Process messages and insert/update in MongoDB
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
                            messageCount: 1, // Default value
                            date, // Store date in ISO format
                        };

                        // Check if a document already exists
                        const existingDoc = await messagesCollection.findOne({
                            channelId: document.channelId,
                            userId: document.userId,
                            dateString: document.dateString,
                        });

                        if (existingDoc) {
                            // If the document exists, update the message count
                            await messagesCollection.updateOne(
                                { _id: existingDoc._id },
                                { $inc: { messageCount: 1 } }
                            );
                        } else {
                            // If no document exists, insert a new one
                            await messagesCollection.insertOne(document);
                        }
                    }
                } catch (error) {
                    if (error.code === 50001) {
                        console.warn(`⚠️ No access to channel: ${channel.name} (${channel.id}), skipping.`);
                    } else {
                        console.error('Error fetching messages:', error);
                    }
                }
            }
        });
    });
}

module.exports = { handleFetchMessages }