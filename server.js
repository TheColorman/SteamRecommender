// Disse ting bliver instaleret ved at køre "npm install <pakke>", fx. "npm install express". De er Node pakker,
// som bruges til forskellige ting

// Server: Computeren der har dette script.
// Client: Computeren der forbinder til vores hjemmeside.

// Server kan få stort set alt informationen fra Client (cookies), men Client kan kun få det som Server sender.

const express = require('express');     // Serveren, altså det der viser HTML siden når du forbinder
const cookieParser = require('cookie-parser');  // Cookie Parser, brugt til at lave cookies så vi kan gemme data om folk (gemt på Client side)
const session = require('express-session'); // Session, bruges til at gemme data om folk (gemt på Server side)
const path = require('path');   // Path, bliver brugt til at finde filer og sådan noget
const fetch = require('node-fetch');    // Fetch, brugt til at forbinde til API's
const greenworks = require('./node_addons/greenworks');    // Greenworks, program der kan forbinde direkte til SteaWorks API

const { catchAsync } = require('./utils.js'); // Vores fil med hjælpefunktioner


const app = express();  // Express bliver brugt til at starte en app (aka. en hjemmeside)

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {    // Hjemmesiden bliverk kørt på localhost, så '/' er 'localhost/'. Hvis der havde stået ".get('/login/')" ville det være 'localhost/login'.
    res.sendFile(path.join(__dirname + '/website/index.html')); // HTML filen bliver sendt til siden
});

app.get('/rating', (req, res) => {
    res.sendFile(path.join(__dirname + '/website/rating/index.html'));
});
app.get('/recommend', (req, res) => {
    res.sendFile(path.join(__dirname + '/website/recommend/index.html'));
});
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname + '/website/contact/index.html'));
});
app.get('/account', (req, res) => {
    res.sendFile(path.join(__dirname + '/website/account/index.html'));
});

app.get('/api-test', catchAsync(async (req, res) => {
    if (greenworks.init()) {

    }
    res.end(`<p>-----end-----</p>`);
}));


const server = app.listen(8080, () => {     // Hjemmesiden bliver startet på port 8080, altså 'localhost:8080'.
    console.log(`Express running => PORT ${server.address().port}`);
});

app.use((err, req, res, next) => {  // fanger fejl
    switch (err.message) {
        default:
            return res.status(500).send({
                status: 'ERROR',
                error: err.message,
            })
    }
});