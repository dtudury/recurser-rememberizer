import { render, h, mapEntries, showIfElse } from './horseless.0.5.1.min.esm.js'
import { model } from './model.js'
import { init, setProgress, toggleBatch } from './db.js'

function calculateOverlap (batch) {
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

function getSortedBatches () {
  const sortedBatches = Object.values(model.batches).sort((a, b) => calculateOverlap(b) - calculateOverlap(a))
  return sortedBatches
}
const RATIO = (1 + Math.sqrt(5)) / 2
function calculateDueness (person) {
  if (model.progress[person.id]) {
    const streak = model.progress[person.id].streak
    const t = (streak[streak.length - 1] - streak[0]) * RATIO
    return (Date.now() - streak[0]) / t - 1
  }
  return 0
}

function getAvailablePeople () {
  if (!model.people) return []
  return model.people.sort((a, b) => calculateDueness(b) - calculateDueness(a))
}

function timeToString (t) {
  t /= 1000 // seconds
  t = Math.floor(t * 10) / 10
  if (t <= 1) return '1 second'
  if (t < 10) return `${t} seconds`
  t = Math.floor(t)
  if (t < 60) return `${t} seconds`
  t /= 60 // minutes
  t = Math.floor(t * 10) / 10
  if (t <= 1) return '1 minute'
  if (t < 10) return `${t} minutes`
  t = Math.floor(t)
  if (t < 60) return `${t} minutes`
  t /= 60 // hours
  t = Math.floor(t * 10) / 10
  if (t <= 1) return '1 hour'
  if (t < 10) return `${t} hours`
  t = Math.floor(t)
  if (t < 60) return `${t} hours`
  t /= 24 // days
  t = Math.floor(t * 10) / 10
  if (t <= 1) return '1 day'
  if (t < 10) return `${t} days`
  t = Math.floor(t)
  if (t < 30) return `${t} days`
  t /= 7 // weeks
  t = Math.floor(t * 10) / 10
  if (t <= 1) return '1 week'
  if (t < 10) return `${t} weeks`
  t = Math.floor(t)
  return `${t} weeks`
}

function getDueFor (person) {
  console.log(person)
  if (model.progress[person.id]) {
    const streak = model.progress[person.id].streak
    console.log(streak)
    console.log(streak[streak.length - 1])
    console.log(streak[0])
    console.log((streak[streak.length - 1] - streak[0]) * RATIO + streak[0])
    console.log((streak[streak.length - 1] - streak[0]) * RATIO + streak[0])
    return (streak[streak.length - 1] - streak[0]) * RATIO + streak[0] - Date.now()
  }
}

function getNextDue () {
  let nextDue = Number.POSITIVE_INFINITY
  model.people.forEach(person => {
    if (model.progress[person.id]) {
      const due = getDueFor(person)
      nextDue = Math.min(nextDue, due)
    }
  })
  if (nextDue === Number.POSITIVE_INFINITY) return null
  const t = Math.abs(Math.floor(nextDue))
  return timeToString(t)
}

const clickBatch = batch => el => async e => {
  e.preventDefault()
  toggleBatch(batch)
}

const calculateStyle = batch => el => {
  if (batch.isLoading) return 'color: lightgray;'
  if (batch.people) return 'color: black;'
  return 'color: dimgray;'
}

const checkbox = batch => el => {
  if (batch.isLoading) return h`<input type="checkbox" indeterminate>`
  if (batch.people) return h`<input type="checkbox" checked>`
  return h`<input type="checkbox">`
}

function next () {
  const availablePeople = getAvailablePeople()
  model.selected = { person: availablePeople[0], revealed: false }
}

const right = el => e => {
  setProgress(model.selected.person, false, 60 * 1000 / RATIO)
  next()
}

const wrong = el => e => {
  setProgress(model.selected.person, true, 5 * 1000 / RATIO)
  next()
}

const snooze = duration => el => e => {
  setProgress(model.selected.person, false, duration / RATIO)
  next()
}

function selectedCard (el) {
  const flip = el => e => {
    if (model.selected.revealed) {
      model.selected.revealed = false
    } else {
      model.selected.revealed = true
    }
  }
  if (model.selected == null) return h`<button onclick=${el => next}>begin</button>`
  return h`
    ${el => {
      if (model.selected.revealed) {
        return h`
          <div style="display: flex; align-items: flex-end; margin-bottom: 1em;">
            <img src="${model.selected.person.image}">
            <button style="width: 100px; margin-left: 1em;" onclick=${right}>right</button>
            <button style="width: 100px; margin-left: 1em;" onclick=${wrong}>wrong</button>
          </div>
          <div>
            ${model.selected.person.first_name}
            ${model.selected.person.middle_name}
            ${model.selected.person.last_name}
          </div>
          <div>
            ${model.selected.person.current_location?.name}
          </div>
          <div>
            ${model.selected.person.batch.name}
          </div>
          <div>
            <h3>Interests</h3>
            ${model.selected.person.interests}
          </div>
          <div>
            <h3>Before RC</h3>
            ${model.selected.person.before_rc}
          </div>
          <div>
            <h3>During RC</h3>
            ${model.selected.person.during_rc}
          </div>
          <div>
            <h3>Pseudonym</h3>
            ${model.selected.person.pseudonym}
          </div>
          <div>
            <h3>Snooze</h3>
            <button onclick=${snooze(60 * 60 * 1000)}>1 hour</button>
            <button onclick=${snooze(24 * 60 * 60 * 1000)}>1 day</button>
            <button onclick=${snooze(7 * 24 * 60 * 60 * 1000)}>1 week</button>
          </div>
          <div style="margin-top: 1em; font-style: italic; color: gainsboro;">
            dueness: ${calculateDueness(model.selected.person)}
          </div>
        `
      } else {
        return h`
          <div style="display: flex; align-items: flex-end; margin-bottom: 1em;">
            <img onclick=${flip} src="${model.selected.person.image}">
            <button style="width: 100px; margin-left: 1em;" onclick=${flip}>flip</button>
          </div>
          ${showIfElse(() => model.progress[model.selected.person.id], h`
            ${showIfElse(() => calculateDueness(model.selected.person) > 0, h`
              <div style="font-style: italic; color: dimgray;">
                This card has been due for ${() => timeToString(getDueFor(model.selected.person))}
              </div>
            `, h`
              <div>
                You know everyone!
              </div>
              <div style="font-style: italic; color: dimgray;">
                This card isn't due for ${() => timeToString(getDueFor(model.selected.person))}
              </div>
            `)}
          `, h`
            <div>
              New person!
            </div>
            <div style="font-style: italic; color: dimgray;">
              The next card is due in ${() => getNextDue}
            </div>
          `)}
        `
      }
    }}
  `
}

const selectPerson = person => el => e => { model.selected = { person, revealed: false } }
const cards = mapEntries(getAvailablePeople, person => {
  return h`<img onclick=${selectPerson(person)} src="${() => person.image}" width="50" height="50">`
})

init()
render(document.body, h`
  <div style="display: flex; height: 100vh; width: 100vw;">
    <div style="flex: 0 0 12em; overflow-y: scroll; background: whitesmoke;">
      ${mapEntries(getSortedBatches, batch => h`
        <label onclick=${clickBatch(batch)} style="display: block; ${calculateStyle(batch)}">
          ${checkbox(batch)}
          ${() => batch.name}
        </label>
      `)}
    </div>
    <div style="flex: 1; display: flex; flex-flow: column;">
      <div style="height: 50px; position:relative; overflow: hidden;">
        <div style="width: 100%; position: absolute; overflow-x: scroll; white-space: nowrap;">
          ${cards}
        </div>
      </div>
      <div style="flex: 1; display: flex; flex-flow: column; padding: 3em 2em; overflow-y: scroll; border-top: 1px solid gray;">
        ${selectedCard}
      </div>
    </div>
  </div>
`)
