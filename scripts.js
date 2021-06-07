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
        description.innerHTML = `You've played ${ratingGame.playtime_forever > 60 ? `${Math.round(ratingGame.playtime_forever/60)} hours`: `${ratingGame.playtime_forever} minutes`}`;
        description.classList.add("text");

        if (!ratingGame) {
            title.innerHTML = "You've run out of games!";
            description.innerHTML = "We've run out of games you can rate! Either click <a href=\"/recommend\">here</a> to begin getting game recommendations, or come back later when you've played more games.";
            fetchStatus.appendChild(title);
            fetchStatus.appendChild(description);
            return;
        }
        img.src = `https://cdn.akamai.steamstatic.com/steam/apps/${ratingGame.appid}/header.jpg`
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




// Recommend script



const fetchStatus = document.getElementById("fetchStatus");
let gameList = [];

const body = document.getElementById("docBody");
body.onload = () => {   // Når siden er loadet, hent recommendations fra "/api/recommendations"
    fetch("/api/recommendations", {
        method: 'GET'
    }).then(async (res) => {
        gameList = await res.json();
        console.log(gameList);

        if (gameList.error) {
            fetchStatus.innerHTML = `<div class="title">
                Not enough rated games.
            </div>
            <div class="text">
                Click <a href="/rating">here</a> to begin rating games so we can craft recommendations for you.
            </div>`;
        }
        updateGame();
    });
}

const updateGame = async () => {  // Henter information om spillet "gameList[0]"
    if (!gameList.length) {
        return noGames();
    }
    const response = await fetch("/api/fetchGameInfo", {    // hent fra /api/fetchGameInfo
        method: 'POST',     // POST = send information til server
        body: JSON.stringify(gameList[0]),  // stringify, lav et objekt om til en string fordi HTTP dumb
        headers: { 'Content-Type': 'application/json' } // Sig at det vi sender er JSON (JSON er javascript objekt)
    });
    const resJSON = await response.json();
    setHtml(gameList[0], resJSON);
}
const noGames = () => {     // Viser noget andet HTML hvis der ikke er flere spil
    fetchStatus.innerHTML = `<div class="title">No more recommendations</div>
    <div class="text"> We've run out of recommendations for you! Either try <a href="/api/reset">resetting your rating</a> and rating a little differently or wait for the database to get more Steam games.</div>`;
}

const setHtml = (newGame, resJSON) => {     // Sætter HTML tekst til information om spillet
    fetchStatus.innerHTML = `<div class="title">${resJSON.name}</div>
    <img class="coverImage" src="${resJSON.header_image}">
    <div class="text">${resJSON.is_free ? "Free!" : resJSON.price_overview ? resJSON.price_overview.final_formatted : "Price unknown."}\n</div>
    <br>
    <div class="test"><a href="https://store.steampowered.com/app/${newGame.appid}" target="_blank" rel="noreferrer noopener">Store page</a></div>
    <div class="text">${resJSON.short_description}</div>
    <br>
    ${resJSON.genres ? `<div class="text"><b>Genres:</b>\n${(resJSON.genres.map(genre => genre.description)).join(", ")}</div>` : ""}
    <br><br>
    <button class="likeButton" onclick="gameList.shift(); if (!gameList.length) { noGames(); } else { updateGame(); }">Next game</button>`;
}
