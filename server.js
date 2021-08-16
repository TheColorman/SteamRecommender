// Disse ting bliver instaleret ved at køre "npm install <pakke>", fx. "npm install express". De er Node pakker,
// som bruges til forskellige ting

// Server: Computeren der har dette script.
// Client: Computeren der forbinder til vores hjemmeside.

// Server kan få stort set alt informationen fra Client (cookies), men Client kan kun få det som Server sender.

//  Her definerer jeg en masse programmer som jeg har installeret gennem Node Package Manager (NPM)
const express = require('express');     // Serveren, altså det der viser HTML siden når du forbinder
const session = require('express-session'); // Session, bruges til at gemme data om folk (gemt på Server side)
const steamLogin = require('steam-login');  // Ting til at logge ind med steam
const bodyParser = require('body-parser');
const path = require('path');   // Path, bliver brugt til at finde filer og sådan noget
const fetch = require('node-fetch');    // Fetch, brugt til at forbinde til API's
const querystring = require('querystring'); // Ting der laver objekter om til queries (det er de dele af et url der ser sådan her ud: "?appid=1234&username=something")
const loki = require('lokijs');     // Database så vi kan gemme data

const { catchAsync } = require('./utils.js'); // Vores fil med hjælpefunktioner
const APIkey = "89903B084E81B0FEC3F90D8B5C4FE540";  // Nøglen der giver adgang til API requests. Secret!
const secret = "flødeboller med carrysauce";    // Hemmelig kode der bliver brugt til vores program.

//#region Databases
// Her laver jeg selve databasen
var UserGames = new loki('./databases/UserGames.json', {
    autoload: true,
    autoloadCallback: UserGamesInitialize,
    autosave: true,
    autosaveInterval: 4000,
});

var SteamGames = new loki('./databases/SteamGames.json', {
    autoload: true,
    autoloadCallback: SteamGamesInitialize,
    autosave: true,
    autosaveInterval: 4000,
});

function UserGamesInitialize() {
    var users = UserGames.getCollection("users");
    if (users == null) {
        users = UserGames.addCollection("users", {
            unique: ["id"],
            autoupdate: true
        });
    }

    runUserGamesLogic();
}
function SteamGamesInitialize() {
    var games = SteamGames.getCollection("games");
    if (games == null) {
        games = SteamGames.addCollection("games", {
            unique: ["appid"],
            autoupdate: true,
        });
    }

    runSteamGamesLogic();
}

function runUserGamesLogic() {
    const userCount = UserGames.getCollection("users").count();
    console.log(`Number of users in database: ${userCount}`);
}

function runSteamGamesLogic() {
    const gameCount = SteamGames.getCollection("games").count();
    console.log(`Number of games in database: ${gameCount}`);
}

//#endregion

const app = express();  // Express bliver brugt til at starte en app (aka. en hjemmeside)

app.use(express.static(path.join(__dirname, 'public')));    // gør så vi kan bruge css
app.use(session({   // måden vi gemmer steam data på
    secret: secret,
    resave: false,
    saveUninitialized: false,
    //cookie: { secure: true },
}
));
app.use(steamLogin.middleware({     // måden vi logger ind på steam på
    realm: 'http://localhost:8081/',
    verify: 'http://localhost:8081/verify',
    apiKey: APIkey,
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {    // Hjemmesiden bliverk kørt på localhost, så '/' er 'localhost/'. Hvis der havde stået ".get('/login/')" ville det være 'localhost/login'.
    res.sendFile(path.join(__dirname + '/website/index.html')); // HTML filen bliver sendt til siden
});

app.get('/rating', catchAsync(async (req, res) => {
    if (!req.user) return res.redirect("/login");
    const steamid = req.user.steamid;
    const userDB = UserGames.getCollection("users");
    let user = userDB.findOne({ id: steamid });
    if (user === null || !user.games.length) {
        res.redirect('/save-games');
    }

    res.send(`<!DOCTYPE html>
    <!--[if lt IE 7]>      <html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
    <!--[if IE 7]>         <html class="no-js lt-ie9 lt-ie8"> <![endif]-->
    <!--[if IE 8]>         <html class="no-js lt-ie9"> <![endif]-->
    <!--[if gt IE 8]>      <html class="no-js"> <!--<![endif]-->
    <html>
        <head>
            <meta charset="utf-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>SANS UNDERTALE</title>
            <meta name="description" content="">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="stylesheet" href="css/style.css">
        </head>
        <body onload="onLoad()" id="docBody">
            <!--[if lt IE 7]>
                <p class="browsehappy">You are using an <strong>outdated</strong> browser. Please <a href="#">upgrade your browser</a> to improve your experience.</p>
            <![endif]-->
    
            <header>
                <a href="/"><div class="companyname">MIST</div></a>
                <nav class="navbar">
                    <a href="/rating"><div  class="navbtn">Rating</div></a>
                    <a href="/recommend"><div  class="navbtn">Recommend</div></a>
                    <a href="/contact"><div  class="navbtn">Contact</div></a>
                    <a href="/account"><div  class="navbtn">My account</div></a>
                </nav>
            </header>
            <div class="content" id="fetchStatus">
                <div class="title">Fetching Steam games</div>
                <div class="text">Please wait a moment...</div>
            </div>

            <script>
                const fetchStatus = document.getElementById("fetchStatus");

                const body = document.getElementById("docBody");
                body.onload = () => {
                    fetch("/api/fetchUserGames", {
                        method: 'GET'
                    }).then(async (res) => {
                        const json = await res.json();
                        const ratingGame = json.ratingGame;
                        console.log(ratingGame);

                        const fetchStatus = document.getElementById("fetchStatus");
                        fetchStatus.innerHTML = "";

                        const title = document.createElement("div");
                        title.innerHTML = ratingGame.name;
                        title.classList.add("title");

                        const img = document.createElement("img");
                        img.classList.add("coverImage");

                        const description = document.createElement("div");
                        description.innerHTML = \`You've played \${ratingGame.playtime_forever > 60 ? \`\${Math.round(ratingGame.playtime_forever/60)} hours\`: \`\${ratingGame.playtime_forever} minutes\`}\`;
                        description.classList.add("text");

                        if (!ratingGame) {
                            title.innerHTML = "You've run out of games!";
                            description.innerHTML = "We've run out of games you can rate! Either click <a href=\\"/recommend\\">here</a> to begin getting game recommendations, or come back later when you've played more games.";
                            fetchStatus.appendChild(title);
                            fetchStatus.appendChild(description);
                            return;
                        }
                        img.src = \`https://cdn.akamai.steamstatic.com/steam/apps/\${ratingGame.appid}/header.jpg\`
                        fetchStatus.appendChild(title);
                        fetchStatus.appendChild(img);
                        fetchStatus.appendChild(description);

                        const buttonLike = document.createElement("button");
                        const buttonDislike = document.createElement("button");
                        const buttonSkip = document.createElement("button");
                        buttonLike.classList.add("likeButton");
                        buttonDislike.classList.add("dislikeButton");
                        buttonSkip.classList.add("skipButton");

                        buttonLike.innerHTML = "Like";
                        buttonDislike.innerHTML = "Dislike";
                        buttonSkip.innerHTML = "Skip";

                        buttonLike.onclick = () => {
                            fetch("/api/rateGame", {
                                method: 'POST',
                                body: JSON.stringify({
                                    appid: ratingGame.appid,
                                    rating: true,
                                }),
                                headers: { 'Content-Type': 'application/json' },
                            }).then(res => {
                                if (res.status == 200) {
                                    location.reload();
                                }
                            });
                        }
                        buttonDislike.onclick = () => {
                            fetch("/api/rateGame", {
                                method: 'POST',
                                body: JSON.stringify({
                                    appid: ratingGame.appid,
                                    rating: false,
                                }),
                                headers: { 'Content-Type': 'application/json' },
                            }).then(res => {
                                if (res.status == 200) {
                                    location.reload();
                                }
                            });
                        }
                        buttonSkip.onclick = () => {
                            fetch("/api/rateGame", {
                                method: 'POST',
                                body: JSON.stringify({
                                    appid: ratingGame.appid,
                                    skip: true,
                                }),
                                headers: { 'Content-Type': 'application/json' },
                            }).then(res => {
                                if (res.status == 200) {
                                    location.reload();
                                }
                            });
                        }

                        fetchStatus.appendChild(buttonLike);
                        fetchStatus.appendChild(buttonDislike);
                        fetchStatus.appendChild(buttonSkip);

                        const lineBreak = document.createElement("br");
                        const resetButton = document.createElement("button");
                        resetButton.innerHTML = "Reset all ratings";
                        resetButton.onclick = () => {
                            fetch("/api/reset", {
                                method: 'GET',
                            }).then(res => {
                                if (res.status == 200) {
                                    location.reload();
                                }
                            });
                        }
                        fetchStatus.appendChild(lineBreak);
                        fetchStatus.appendChild(resetButton)
                    });
                }
            </script>
        </body>
    </html>`);
}));

app.get('/recommend', (req, res) => {
    if (!req.user) return res.redirect("/login");
    const steamid = req.user.steamid;
    const userDB = UserGames.getCollection("users");

    let user = userDB.findOne({ id: steamid });
    if (user === null || !user.games.length) return res.redirect("/save-games");

    res.send(`<!DOCTYPE html>
    <!--[if lt IE 7]>      <html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
    <!--[if IE 7]>         <html class="no-js lt-ie9 lt-ie8"> <![endif]-->
    <!--[if IE 8]>         <html class="no-js lt-ie9"> <![endif]-->
    <!--[if gt IE 8]>      <html class="no-js"> <!--<![endif]-->
    <html>
        <head>
            <meta charset="utf-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>SANS UNDERTALE</title>
            <meta name="description" content="">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="stylesheet" href="css/style.css">
        </head>
        <body onload="onLoad()" id="docBody">
            <!--[if lt IE 7]>
                <p class="browsehappy">You are using an <strong>outdated</strong> browser. Please <a href="#">upgrade your browser</a> to improve your experience.</p>
            <![endif]-->
    
            <header>
                <a href="/"><div class="companyname">MIST</div></a>
                <nav class="navbar">
                    <a href="/rating"><div  class="navbtn">Rating</div></a>
                    <a href="/recommend"><div  class="navbtn">Recommend</div></a>
                    <a href="/contact"><div  class="navbtn">Contact</div></a>
                    <a href="/account"><div  class="navbtn">My account</div></a>
                </nav>
            </header>
            <div class="content" id="fetchStatus">
                <div class="title">Fetching recommendations</div>
                <div class="text">Please wait a moment...</div>
            </div>

            <script>
                const fetchStatus = document.getElementById("fetchStatus");
                let gameList = [];
                const updateGame = () => {
                    if (!gameList.length) return;
                    fetch("/api/fetchGameInfo", {
                        method: 'POST',
                        body: JSON.stringify(gameList[0]),
                        headers: { 'Content-Type': 'application/json' }
                    }).then(response => {
                        return response.json();
                    }).then(resJSON => {
                        if (!gameList.length) return noGames();
                        setHtml(gameList[0], resJSON);
                    });
                }
                const noGames = () => {
                    fetchStatus.innerHTML = \`<div class="title">No more recommendations</div>
                    <div class="text"> We've run out of recommendations for you! Either try <a href="/api/reset">resetting your rating</a> and rating a little differently or wait for the database to get more Steam games.</div>\`;
                }
                const setHtml = (newGame, resJSON) => {
                    fetchStatus.innerHTML = \`<div class="title">\${resJSON.name}</div>
                    <img class="coverImage" src="\${resJSON.header_image}">
                    <div class="text">\${resJSON.is_free ? "Free!" : resJSON.price_overview ? resJSON.price_overview.final_formatted : "Price unknown."}\n</div>
                    <br>
                    <div class="test"><a href="https://store.steampowered.com/app/\${newGame.appid}" target="_blank" rel="noreferrer noopener">Store page</a></div>
                    <div class="text">\${resJSON.short_description}</div>
                    <br>
                    \${resJSON.genres ? \`<div class="text"><b>Genres:</b>\\n\${(resJSON.genres.map(genre => genre.description)).join(", ")}</div>\` : ""}
                    <br><br>
                    <button class="likeButton" onclick="gameList.shift(); if (!gameList.length) { noGames(); } else { updateGame(); }">Next game</button>\`;
                }

                const body = document.getElementById("docBody");
                body.onload = () => {
                    fetch("/api/recommendations", {
                        method: 'GET'
                    }).then(async (res) => {
                        gameList = await res.json();
                        console.log(gameList);
                
                        if (gameList.error) {
                            fetchStatus.innerHTML = \`<div class="title">
                                Not enough rated games.
                            </div>
                            <div class="text">
                                Click <a href="/rating">here</a> to begin rating games so we can craft recommendations for you.
                            </div>\`;
                        }
                        updateGame();
                    });
                }
            </script>
        </body>
    </html>`);
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname + '/website/contact/index.html'));
});
app.get('/account', (req, res) => {
    if (!req.user) return res.redirect("/login");
    res.sendFile(path.join(__dirname + '/website/account/index.html'));
});

//#region Login system
app.get('/login', steamLogin.authenticate(), (req, res) => {
    res.redirect('/verify');
});
app.get('/verify', steamLogin.verify(), catchAsync(async (req, res) => {
    res.redirect('/save-games');
}));
app.get('/logout', steamLogin.enforceLogin('/'), (req, res) => {
    req.logout();
    res.redirect('/');
});
//#endregion

// Gem personens spil
app.get('/save-games', catchAsync(async (req, res) => {
    if (!req.user) return res.redirect('/login');
    const steamid = req.user.steamid;
    // Save to database
    const userDB = UserGames.getCollection("users");
    // Request user games from steam API
    const request = {
        key: APIkey,
        steamid: steamid,
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
    console.log(request);
    const games = resjson.response.games;
    let user = userDB.findOne({ id: steamid });
    if (user === null) {
        userDB.insert({
            id: steamid,
            games: games,
            username: resjson.personaname,
            avatar: resjson.avatarhash,
            tags: [],
        });
    } else {
        games.forEach(game => {
            if (user.games.find(uGame => uGame.appid == game.appid)) return;
            user.games.push(game);
        });
        user.username = resjson.personaname;
        user.avatar = resjson.avatarhash;
        userDB.update(user);
    }
    res.redirect('/');
}));

// Gem flere steam spil i databasen
app.get('/reload-database', catchAsync(async (req, res) => {
    
    // Få en liste over alle steam spil
    const allGamesListRes = await fetch(`https://api.steampowered.com/ISteamApps/GetAppList/v2/`, {
        method: 'GET',
    });
    const steamGames = (await allGamesListRes.json()).applist.apps;
    const steamGamesDB = SteamGames.getCollection("games");
    
    // Check hvert steam spil og gem tags
    for (let i = steamGamesDB.count(); i < steamGames.length; i++) {
        const steamGame = steamGames[i];
        let foundGame = steamGamesDB.findOne({ appid: steamGame.appid });
        
        console.log(`App ${i}/${steamGames.length}`);
        if (foundGame) {
            console.log(`App already in database, skipping...`);
            continue;
        }
        console.log(`Fetching app ${JSON.stringify(steamGame)}`);
        await fetch(`https://store.steampowered.com/app/${steamGame.appid}`, {
            method: 'GET',
        }).then(async appRes => {
            const appHtml = await appRes.text();
            const regexp = /<a[^>]*class=\"app_tag\"[^>]*>([^<]*)<\/a>/gmi;
            const regexpArr = [...appHtml.matchAll(regexp)];
            const result = appHtml.match(regexp);
            
            let tags = [];
            regexpArr.forEach(match => {
                tags.push(match[1].trim());
            });
            let game = steamGamesDB.findOne({ appid: steamGame.appid });
            if (game === null) {
                steamGamesDB.insert({
                    appid: steamGame.appid,
                    tags: tags
                });
            } else {
                game.tags = tags;
                steamGamesDB.update(game);
            }
            console.log(`App tags: ${tags}`);
            
        });
        res.end(`what is up dog`);
    }
}));

// API endpoints
    // Får spil fra brugerens bibliotek og sender et spil der skal rates tilbage
app.get('/api/fetchUserGames', catchAsync(async (req, res) => {
    if (!req.user) return res.redirect('/login');   // You can only make this API call if you are logged in, so this shouldn't be necessary, but you never know.
    const steamid = req.user.steamid;
    const steamGamesDB = SteamGames.getCollection("games");
    const userDB = UserGames.getCollection("users");
    let user = userDB.findOne({ id: steamid });
    for (let i = 0; i < user.games.length; i++) {
        let game = steamGamesDB.findOne({ appid: user.games[i].appid });
        if (game === null) {
            addedGames = true;
            console.log(`Could not find game: ${user.games[i].name} with ID ${user.games[i].appid}`);
            await fetch(`https://store.steampowered.com/app/${user.games[i].appid}`, {
                method: 'GET',
            }).then(async (appRes) => {
                const appHtml = await appRes.text();
                const regexp = /<a[^>]*class=\"app_tag\"[^>]*>([^<]*)<\/a>/gmi;
                const regexpArr = [...appHtml.matchAll(regexp)];

                let tags = [];
                regexpArr.forEach(match => {
                    tags.push(match[1].trim());
                });

                steamGamesDB.insert({
                    appid: user.games[i].appid,
                    tags: tags,
                });
                console.log(`Game tags: ${tags}\n`);
            });
        }
    }

    const ratingGame = user.games.find(game => !game.rated && game.playtime_forever >= 10);
    if (!ratingGame) {
        res.json({
            ratingGame: 0,
        });
    } else {   
        res.json({
            ratingGame: ratingGame
        });
    }
    res.status(200).end();
}));

    // Giver et spil en rating
app.post('/api/rateGame', catchAsync(async (req, res) => {
    if (!req.user) return res.redirect('/login');
    const steamid = req.user.steamid;
    const userDB = UserGames.getCollection("users");
    const user = userDB.findOne({ id: steamid });
    const steamGamesDB = SteamGames.getCollection("games");
    const game = steamGamesDB.findOne({ appid: req.body.appid });
    if (req.body.skip) {
        (user.games.find(uGame => uGame.appid == game.appid)).rated = true;
        userDB.update(user);
        res.status(200).end();
        return;
    }


    for (let i = 0; i < game.tags.length; i++) {
        if (!user.tags) user.tags = [];
        let tag = user.tags.find(tag => tag.name == game.tags[i]);
        if (tag) {
            req.body.rating ? tag.rating += 1 : tag.rating -= 1;
        } else {
            user.tags.push({
                name: game.tags[i],
                rating: req.body.rating ? 1 : -1,
            });
        }
    }
    (user.games.find(uGame => uGame.appid == game.appid)).rated = true;

    steamGamesDB.update(game);
    userDB.update(user);

    console.log(user.tags);

    res.status(200).end();
}));

    // Laver en liste af spil baseret på tags brugeren kan lide og returnere listen
app.get('/api/recommendations', catchAsync(async (req, res) => {
    if (!req.user) return res.redirect('/login');
    const steamid = req.user.steamid;
    const userDB = UserGames.getCollection("users");
    const steamGamesDB = SteamGames.getCollection("games");
    const user = userDB.findOne({ id: steamid });

    const userTags = [...user.tags];    // Lav kopi af brugers liked/disliked tags
    userTags.sort((a, b) => {   // Sortér tags efter rating
        if (a.rating < b.rating) return 1;
        if (b.rating < a.rating) return -1;
        return 0;
    });
    if (!userTags || userTags.length < 15) {     // Hvis der er under 15 tags, så send fejl (det betyder man ikke har rated nok spil)
        res.json({
            error: 1,
        });
        res.status(200).end();
        return;
    }

    const topTags = userTags.splice(0, 5);  // Bedste (første) 5 tags
    const botTags = userTags.splice(-5, 5); // Værste (sidste) 5 tags

    const topTagsFlat = topTags.map(tag => tag.name);   // Tags, men  ["Action", "Adventure"] i stedet for [{ name: "Action", rating: 5 }, { name: "Adventure", rating: 3 }]
    const botTagsFlat = botTags.map(tag => tag.name);

    const userGames = [...user.games];  // Kopi 
    const userGamesMapped = userGames.map(game => game.appid);  // Brugerens spil, men [75435, 734532] i stedet for [{ appid: "75435", name: "Big Bone Simulator", playtime_forever: 123 }...]

    const bestGames = steamGamesDB.where((game) => {    // Filtér spil
        if (userGamesMapped.includes(game.appid)) return false; // Hvis allerede spillet, send false
        const gameTags = game.tags;
        if (!gameTags.length) return false; // Hvis spillet ikke har tags, send false

        // KUN hvis spillet har BÅDE 5 bedste tags OG IKKE har 5 værste tags, send true
        return topTagsFlat.every(tag => gameTags.includes(tag)) && botTagsFlat.every(tag => !gameTags.includes(tag));
    });

    const bestGamesMapped = bestGames.map((game) => {   // Spil, men [{ appid: "1234", tags: ["Action", "Adventure"] }] i stedet for [{ appid: "1234", tags: ["Action", "Adventure"], ... }]
        return {
            appid: game.appid,
            tags: game.tags,
        }
    });

    // Shuffle funktion, spørg stackoverflow
    const shuffle = (array) => {    //https://stackoverflow.com/a/2450976/9877700
        var currentIndex = array.length, temporaryValue, randomIndex;

        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

    const bestGamesShuffled = shuffle(bestGamesMapped); // Shuffled games

    res.json(bestGamesShuffled);    // Giv spil tilbage til Client
}));

    // Får information om spil, som beskrivelse, billede og pris
app.post('/api/fetchGameInfo', catchAsync(async (req, res) => {
    if (!req.user) return res.redirect('/login');

    await fetch(`http://store.steampowered.com/api/appdetails?appids=${req.body.appid}`, {
        method: 'GET'
    }).then(response => {
        return response.json();
    }).then(json => {
        if (!json || !json[req.body.appid].success) {
            return res.json({
                error: 1,
            });
        }
        return res.json(json[req.body.appid].data);
    });
}));

    // Fjerne alle tidligere ratings
app.get('/api/reset', catchAsync(async (req, res) => {
    if (!req.user) return res.redirect('/login');
    const steamid = req.user.steamid;
    const userDB = UserGames.getCollection("users");
    const user = userDB.findOne({ id: steamid });
    
    user.games.forEach(game => {
        game.rated = false;
    });
    user.tags = [];
    userDB.update(user);
    res.status(200).end();
}));

const server = app.listen(8081, () => {     // Hjemmesiden bliver startet på port 8080, altså 'localhost:8080'.
console.log(`Express running => PORT ${server.address().port}`);
});

app.use((err, req, res, next) => {  // fanger fejl
    switch (err.message) {
        default:
            return res.status(500).send({
                status: 'ERROR',
                error: err.message,
            });
    }
});