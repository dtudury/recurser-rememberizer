import { render, h, mapEntries, showIfElse } from './horseless.0.5.1.min.esm.js'
import { model } from './model.js'
import { init, loadPeople, startProgress } from './db.js'

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

function getAvailablePeople() {
    const people = []
    getSortedBatches().forEach(batch => {
        if (batch.people) {
            Object.values(batch.people).forEach(person => {
                if (people.indexOf(person) === -1 && !model.progress[person.id]) {
                    people.push(person)
                }
            })
        }
    })
    return people
}

const toggleBatch = batch => el => async e => {
    loadPeople(batch)
}

const clickPerson = person => el => async e => {
    startProgress(person)
}

const selectPerson = person => el => e => {
    model.selected = { person, revealed: false }
}

const calculateStyle = batch => el => {
    if (batch.isLoading) return 'color: lightgreen;'
    if (batch.people) return 'color: green;'
    return ''
}

const calculateOverlapText = batch => el => {
    const overlap = Math.round(calculateOverlap(batch) / (7 * 24 * 60 * 60 * 1000) + 3 / 7) // 3/7: 2/7 for the 2 weekend days and 1/7 for the first day
    if (overlap > 0) return `(${overlap} week overlap)`
    return '' // `${-overlap} week gap`
}

function showSelected(el) {
    const flip = el => e => {
        if (model.selected.revealed) {
            model.selected.revealed = false
        } else {
            model.selected.revealed = true
        }
    }
    if (model.selected == null) return 'begin'
    return h`
        <img onclick=${flip} src="${model.selected.person.image}">
        ${el => {
            if (model.selected.revealed) {
                return h`
                    ${model.selected.person.first_name}
                    ${model.selected.person.middle_name}
                    ${model.selected.person.last_name}
                `
            }
        }}
    `
}

const cards = mapEntries(() => model.progress, item => {
    const person = model.batches[item.batchId].people[item.id]
    return h`<img onclick=${selectPerson(person)} src="${() => person.image}" width="50" height="50">`
})

init()
render(document.body, h`
    <div style="height: 50vh; display: flex; flex-flow: column;">
        <div style="height: 50px; overflow-x: scroll; overflow-y: hidden; white-space: nowrap;">
            ${cards}
        </div>
        <div style="flex: 1;">
            ${showSelected}
        </div>
    </div>
    <div style="height: 50vh; display: flex;">
        <div style="flex: 1; overflow: scroll;">
            ${mapEntries(getAvailablePeople, person => h`
                <div onclick="${clickPerson(person)}">
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