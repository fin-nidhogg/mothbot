const express = require('express');
const app = express();
const helmet = require('helmet');

app.use(helmet());

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.listen(6969, function () {
    console.log("Server is running on port 6969");
})