var hackerschool = require('hackerschool-api')
var app = require('express')()
require('dotenv').config()

var client = hackerschool.client();

var auth = hackerschool.auth({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uri: process.env.REDIRECT_URI
});

app.get('/', function (req, res) {
    if (!client.token) {
        res.redirect(auth.createAuthUrl());
    } else {
        client.token.refresh(
            (error, result) => {
                if (error) return res.redirect(auth.createAuthUrl());
                client.people.me()
                    .then(function (me) {
                        res.send(JSON.stringify(me))
                    })
            }
        )
    }
})

app.get('/oauthCallback', function (req, res) {
    var code = req.query.code;

    auth.getToken(code)
        .then(function (token) {
            client.setToken(token);
            res.redirect('/')
        }, function (err) {
            res.send('There was an error getting the token');
        });
});

app.listen(3000);