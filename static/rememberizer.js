import { proxy, render, h, mapEntries } from './horseless.0.5.1.min.esm.js'

const model = proxy({
    people: {},
    batches: {}
})

async function hitRememberizerApi(path) {
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

async function getMe() {
    model.me = await hitRememberizerApi('/me')
}
async function getPerson(id) {
    const person = await hitRememberizerApi(`/person/${id}`)
    people[id] = person
}
async function getList() {
    const list = await hitRememberizerApi('/list')
    list.forEach(batch => {
        model.batches[batch.id] = batch
    })
}
async function getBatch(id) {
    return hitRememberizerApi(`/batch/${id}`)
}
async function getPeople(id) {
    const people = await hitRememberizerApi(`/people/${id}`)
    model.batches[id].people = []
    people.forEach(person => {
        if (person.id !== model.me.id) {
            model.batches[id].people.push(person.id)
            model.people[person.id] = person
        }
    })
}

function calculateOverlap(batch) {
    const myStart = new Date(model.me.batch.start_date)
    const myEnd = new Date(model.me.batch.end_date)
    const batchStart = new Date(batch.start_date)
    const batchEnd = new Date(batch.end_date)
    if (myStart < batchStart) {
        if (myEnd < batchEnd) {
            return myEnd - batchStart
        } else {
            return batchEnd - batchStart
        }
    }
    if (myStart < batchEnd) {
        if (myEnd < batchEnd) {
            return myEnd - myStart
        } else {
            return batchEnd - myStart
        }
    }
    return batchEnd - myStart
}

function getSortedBatches() {
    const sortedBatches = Object.values(model.batches).sort((a, b) => calculateOverlap(b) - calculateOverlap(a))
    return sortedBatches
}

async function init() {
    await Promise.all([getList(), getMe()])
    await getPeople(model.me.batch.id)
    console.log(JSON.parse(JSON.stringify(model)))
}

const clickMe = el => e => {
    init()
}

const loadPeople = id => el => async e => {
    await getPeople(id)
    console.log(JSON.parse(JSON.stringify(model)))
}

init()
render(document.body, h`
    <span onclick=${clickMe}>init again</span>
    ${mapEntries(getSortedBatches, batch => h`
        <div onclick=${loadPeople(batch.id)}>
            ${batch.name}
        </div>
    `)}
`)