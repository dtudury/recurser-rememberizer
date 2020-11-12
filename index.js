const hackerschool = require('hackerschool-api')
const express = require('express')
const dotenv = require('dotenv')

const STATIC_DIR = `${__dirname}/static`

dotenv.config()

const auth = hackerschool.auth({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uri: process.env.REDIRECT_URI
})
const client = hackerschool.client()

const app = express()

function checkToken(res, refresh) {
    return new Promise((resolve, reject) => {
        const redirect = error => {
            res.redirect(auth.createAuthUrl())
            reject(error)
        }
        if (!client.token) redirect(new Error('no token'))
        if (refresh) {
            client.token.refresh((error, result) => {
                if (error) setTimeout(() => redirect(error), 5000)
                else resolve(result)
            })
        } else {
            resolve()
        }
    })
}

app.use(express.static(STATIC_DIR))

async function hitRecurseApi(res, name, f, id) {
    try {
        await checkToken(res, false)
        const v = await f(id)
        res.send(v)
    } catch (err) {
        console.error(`${name} err`, err)
        if (!res.writableFinished) {
            res.send(`{ err="There was an error getting ${name}" id="${id}" }`)
        }
    }
}

app.get('/me', (req, res) => hitRecurseApi(res, 'me', client.people.me))
app.get('/person/:id', (req, res) => hitRecurseApi(res, 'person', client.people.person, req.params.id))
app.get('/list', (req, res) => hitRecurseApi(res, 'list', client.batches.list))
app.get('/batch/:id', (req, res) => hitRecurseApi(res, 'batch', client.batches.batch, req.params.id))
app.get('/people/:id', (req, res) => hitRecurseApi(res, 'people', client.batches.people, req.params.id))
app.get('/', async (req, res) => {
    try {
        await checkToken(res, true)
        res.sendFile('rememberizer.html', { root: STATIC_DIR })
    } catch (err) {
        console.error('logging in err', err)
        if (!res.writableFinished) {
            res.send('There was an error logging in')
        }
    }
})
app.get('/oauthCallback', async (req, res) => {
    try {
        const token = await auth.getToken(req.query.code)
        client.setToken(token)
        res.redirect('/')
    } catch (err) {
        console.error('oauthCallback err', err)
        res.send('There was an error getting the token')
    }
});

app.listen(process.env.PORT || 80)
