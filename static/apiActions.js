import { model } from './model.js'

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

export async function getMe() {
    model.me = await hitRememberizerApi('/me')
}
/*
async function getPerson(id) {
    const person = await hitRememberizerApi(`/person/${id}`)
    people[id] = person
}
*/
export async function getList() {
    const list = await hitRememberizerApi('/list')
    list.forEach(batch => {
        model.batches[batch.id] = model.batches[batch.id] || batch
    })
}
/*
async function getBatch(id) {
    return hitRememberizerApi(`/batch/${id}`)
}
*/

export async function getPeople(id) {
    model.batches[id].isLoading = true
    const people = await hitRememberizerApi(`/people/${id}`)
    model.batches[id].people = []
    people.forEach(person => {
        if (person.id !== model.me.id) {
            model.batches[id].people.push(person)
        }
    })
    model.batches[id].isLoading = false
}