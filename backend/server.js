const express = require('express');
const Stats = require('./models/user_stats');
const app = express();
const helmet = require('helmet');
const db = require('./dbConnection');

app.use(helmet());

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.listen(6969, function () {
    console.log("Server is running on port 6969");
});

const statsData = new Stats({ guildId: 123, channelId: 456, channelName: 'general', userId: 789, username: 'testuser', nickname: 'testnickname', messageCount: 10 });
try {
    statsData.save();
    console.log('Data saved successfully');
}
catch (err) {
    console.log(err);
};