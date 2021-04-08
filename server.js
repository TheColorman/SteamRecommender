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
const querystring = require('querystring'); // Ting der laver arrays om til queries (det er de dele af et url der ser sådan her ud: "?appid=1234&username=something")
const greenworks = require('./node_addons/greenworks');    // Greenworks, program der kan forbinde direkte til SteaWorks API
const steamLogin = require('steam-login');  // Ting til at logge ind med steam
const redis = require('redis'); // en eller anden database

let RedisStore = require('connect-redis')(session); // Ting der gør så jeg kan bruge databasen
let redisClient = redis.createClient();

const { catchAsync } = require('./utils.js'); // Vores fil med hjælpefunktioner
const APIkey = "89903B084E81B0FEC3F90D8B5C4FE540";  // Nøglen der giver adgang til API requests. Secret!
const secret = "flødeboller med carrysauce";    // Hemmelig kode der bliver brugt til vores program.

const app = express();  // Express bliver brugt til at starte en app (aka. en hjemmeside)

app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: secret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true },
}));
app.use(steamLogin.middleware({
    realm: 'http://localhost:8080/',
    verify: 'http://localhost:8080/verify',
    apiKey: APIkey,
}));

app.get('/', (req, res) => {    // Hjemmesiden bliverk kørt på localhost, så '/' er 'localhost/'. Hvis der havde stået ".get('/login/')" ville det være 'localhost/login'.
    res.sendFile(path.join(__dirname + '/website/index.html')); // HTML filen bliver sendt til siden
});

app.get('/rating', (req, res) => {
    console.log(req.user);
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


app.get('/login', steamLogin.authenticate(), (req, res) => {
    res.redirect('/');
});

app.get('/verify', steamLogin.verify(), (req, res) => {
    res.redirect('/');
});

app.get('/logout', steamLogin.enforceLogin('/'), (req, res) => {
    req.logout();
    res.redirect('/');
});

app.get('/api-test', catchAsync(async (req, res) => {
    if (req.user == null) return res.end('<p>You\'re not <a href="/login"> logged in</a>.</p>');
    const steamID = req.user.steamid;
    const request = {
        key: APIkey,
        steamid: steamID,
        include_appinfo: true,
        include_played_free_games: true,
    }
    const response = await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1?${querystring.stringify(request)}`, {
        method: 'GET',
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",

        }
    });
    const resjson = await response.json();
    const games = resjson.response.games;
    const filteredGames = games.filter(game => game.playtime_forever >= 60);
    req.user.games = filteredGames;
    const sortedGames = filteredGames.sort((a, b) => b.playtime_forever - a.playtime_forever);
    res.setHeader('Content-Type', 'text/html; charset=utf8');
    res.write("<h1>List of steam games you have at least 1 hour of playtime in.<br><br>");
    sortedGames.forEach(game => {
        res.write(`<h3>${game.name}</h3>`);
        res.write(`<img src="http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_logo_url}.jpg">`)
        res.write(`<p>Playtime: ${game.playtime_forever/60} hours</p><br>`);
    });

    if (greenworks.init()) {
    }
    res.end();
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