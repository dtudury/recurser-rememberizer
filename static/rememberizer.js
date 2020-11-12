import { proxy, render, h } from './horseless.0.5.1.min.esm.js'

const model = proxy({
    people: {},
    batches: {}
})

async function hitRememberizerApi (path) {
    try {
        const res = await fetch(path)
        if (!res.ok) {
            console.log('res', res)
        }
        return await res.json()
    } catch (err) {
        console.error(`problem getting ${path}`, err)
        location.reload()
        throw err
    }
}

async function getMe () {
    model.me = await hitRememberizerApi('/me')
}
async function getPerson (id) {
    const person = await hitRememberizerApi(`/person/${id}`)
    people[id] = person
}
async function getList () {
    const list = await hitRememberizerApi('/list')
    list.forEach(batch => {
        model.batches[batch.id] = batch
    })
}
async function getBatch (id) {
    return hitRememberizerApi(`/batch/${id}`)
}
async function getPeople (id) {
    const people = await hitRememberizerApi(`/people/${id}`)
    model.batches[id].people = []
    people.forEach(person => {
        if (person.id !== model.me.id) {
            model.batches[id].people.push(person.id)
            model.people[person.id] = person
        }
    })
}

async function init () {
    await Promise.all([getList(), getMe()])
    await getPeople(model.me.batch.id)
    console.log(JSON.parse(JSON.stringify(model)))
}

const clickMe = el => e => {
    init()
}

init()
render(document.body, h`
    <span onclick=${clickMe}>init again</span>
`)