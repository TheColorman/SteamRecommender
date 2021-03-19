const express = require('express');
const path = require('path');
const app = express();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname+'/website/index.html'));
})

const server = app.listen(7000, () => {
    console.log(`Express running => PORT ${server.address().port}`);
});