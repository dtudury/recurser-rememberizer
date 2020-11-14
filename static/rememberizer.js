import { render, h, mapEntries } from './horseless.0.5.1.min.esm.js'
import { model, saveActiveBatches } from './model.js'
import { getMe, getList, getPeople } from './apiActions.js'
import { db } from './db.js'

function calculateOverlap(batch) {
    if (!model.me || !model.me.batch) return 0
    const myStart = new Date(model.me.batch.start_date)
    const myEnd = new Date(model.me.batch.end_date)
    const batchStart = new Date(batch.start_date)
    const batchEnd = new Date(batch.end_date)
    const bonus = (Date.now() > batchStart && Date.now() < batchEnd) ? 1 : 0
    if (myStart < batchStart) {
        if (myEnd < batchEnd) {
            return myEnd - batchStart + bonus
        } else {
            return batchEnd - batchStart + bonus
        }
    }
    if (myStart < batchEnd) {
        if (myEnd < batchEnd) {
            return myEnd - myStart + bonus
        } else {
            return batchEnd - myStart + bonus
        }
    }
    return batchEnd - myStart + bonus
}

function getSortedBatches() {
    const sortedBatches = Object.values(model.batches).sort((a, b) => calculateOverlap(b) - calculateOverlap(a))
    return sortedBatches
}

function getKnownPeople() {
    const people = []
    getSortedBatches().forEach(batch => {
        if (batch.people) {
            batch.people.forEach(person => {
                if (people.indexOf(person) === -1) {
                    people.push(person)
                }
            })
        }
    })
    return people
}

async function init() {
    await Promise.all([getList(), getMe()])
    Object.assign((await db).transaction(['batches']).objectStore('batches').get('active'), {
        onsuccess: async event => {
            const batches = event.target.result
            if (!batches.length) {
                batches.push(model.me.batch.id)
            }
            await Promise.all(batches.map(batch => {
                return getPeople(batch)
            }))
            console.log('batches', event.target.result)
            saveActiveBatches()
        },
        onfailure: event => {
            console.log('failure', event)
        }
    })
}

const toggleBatch = batch => el => async e => {
    if (model.batches[batch.id].isLoading) return
    if (model.batches[batch.id].people) delete model.batches[batch.id].people
    else getPeople(batch.id)
}

const addPerson = person => el => async e => {
    const personProgress = {
        streak: [],
        id: person.id,
        batchId: person.batch.id
    }
    Object.assign((await db).transaction(['progress'], 'readwrite').objectStore('progress').put(personProgress), {
        onsuccess: event => {
            console.log('stored progress', event.target.result)
        }
    })
}

const calculateStyle = batch => el => {
    if (batch.isLoading) return 'color: lightgreen;'
    if (batch.people) return 'color: green;'
    return ''
}

const calculateOverlapText = batch => el => {
    let overlap = Math.round(calculateOverlap(batch) / (7 * 24 * 60 * 60 * 1000) + 3 / 7) // 3/7: 2/7 for the 2 weekend days and 1/7 for the first day
    if (overlap > 0) return `(${overlap} week overlap)`
    return '' // `${-overlap} week gap`
}

init()
render(document.body, h`
    <div style="height: 50vh;">
    here
    </div>
    <div style="height: 50vh; display: flex;">
        <div style="flex: 1; overflow: scroll;">
            ${mapEntries(getKnownPeople, person => h`
                <div onclick="${addPerson(person)}">
                    <img src="${() => person.image}" width="50" height="50">
                    ${() => person.first_name}
                    ${() => person.middle_name}
                    ${() => person.last_name}
                </div>
            `)}
        </div>
        <div style="flex: 1; overflow: scroll;">
            ${mapEntries(getSortedBatches, batch => h`
                <div onclick=${toggleBatch(batch)} style="${calculateStyle(batch)}">
                    ${() => batch.name}
                    ${calculateOverlapText(batch)}
                </div>
            `)}
        </div>
    </div>
`)