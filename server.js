const path = require('path')
const hackerschool = require('hackerschool-api')
const express = require('express')
const cookieParser = require('cookie-parser')
const dotenv = require('dotenv')
dotenv.config()

const STATIC_DIR = path.join(__dirname, 'static')
const PORT = process.env.PORT || 80

const auth = hackerschool.auth({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  redirect_uri: process.env.REDIRECT_URI
})
const cookieConfig = {
  httpOnly: true, // to disable accessing cookie via client side js
  // secure: true, // to force https (if you use it)
  // maxAge: 1000000, // ttl in seconds (remove this option and cookie will die when browser is closed)
  signed: true // if you use the secret with cookieParser
}

const app = express()

const hackerschoolClients = {}

function checkToken (req, res, refresh) {
  return new Promise((resolve, reject) => {
    const redirect = error => {
      res.redirect(auth.createAuthUrl())
      reject(error)
    }
    const code = req.signedCookies.session
    const client = hackerschoolClients[code]
    if (!client || !client.token) return redirect(new Error('no token'))
    if (refresh) {
      client.token.refresh((error, result) => {
        if (error) setTimeout(() => redirect(error), 5000)
        else resolve(client)
      })
    } else {
      resolve(client)
    }
  })
}

app.use(express.static(STATIC_DIR))
app.use(cookieParser('8807C731051C2578BA9DBE7A373A559C68923766AFC0ED9C'))

async function hitRecurseApi (req, res, name, f, id) {
  try {
    const client = await checkToken(req, res, false)
    const v = await f(client)(id)
    res.send(v)
  } catch (err) {
    console.error(`${name} err`, err)
    if (!res.writableFinished) {
      res.send(`{ err="There was an error getting ${name}" id="${id}" }`)
    }
  }
}

app.get('/me', (req, res) => hitRecurseApi(req, res, 'me', client => client.people.me))
app.get('/person/:id', (req, res) => hitRecurseApi(req, res, 'person', client => client.people.person, req.params.id))
app.get('/list', (req, res) => hitRecurseApi(req, res, 'list', client => client.batches.list))
app.get('/batch/:id', (req, res) => hitRecurseApi(req, res, 'batch', client => client.batches.batch, req.params.id))
app.get('/people/:id', (req, res) => hitRecurseApi(req, res, 'people', client => client.batches.people, req.params.id))
app.get('/', async (req, res) => {
  try {
    await checkToken(req, res, true)
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
    res.cookie('session', req.query.code, cookieConfig)
    const token = await auth.getToken(req.query.code)
    const client = hackerschool.client()
    client.setToken(token)
    hackerschoolClients[req.query.code] = client
    res.redirect('/')
  } catch (err) {
    console.error('oauthCallback err', err)
    res.send('There was an error getting the token')
  }
})

app.listen(PORT)
console.log('app listening on port', PORT)
