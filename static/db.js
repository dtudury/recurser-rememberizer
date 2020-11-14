import { model, saveActiveBatches, updateProgress } from './model.js'
import { getMe, getList, getPeople } from './apiActions.js'

export const db = new Promise((resolve, reject) => {
  Object.assign(window.indexedDB.open('rememberizer'), {
    onupgradeneeded: function (event) {
      const progressObjectStore = event.target.result.createObjectStore('progress', { keyPath: 'id' })
      progressObjectStore.createIndex('batchId', 'batchId', { unique: false })
      event.target.result.createObjectStore('batches')
    },
    onsuccess: function (event) {
      resolve(event.target.result)
    },
    onerror: function (event) {
      console.error(event)
      reject(event)
    }
  })
})

export async function setProgress (person, reset) {
  const personProgress = JSON.parse(JSON.stringify(model.progress[person.id] || {
    streak: [],
    id: person.id,
    batchId: person.batch.id
  }))
  if (reset) {
    personProgress.streak = [Date.now()]
  } else {
    personProgress.streak.push(Date.now())
  }
  model.progress[person.id] = personProgress
  Object.assign((await db).transaction(['progress'], 'readwrite').objectStore('progress').put(personProgress), {
    onsuccess: event => {
      console.log('adding person')
      model.progress[personProgress.id] = personProgress
      console.log('stored progress', event.target.result)
      updateProgress()
    }
  })
}

export async function toggleBatch (batch) {
  if (model.batches[batch.id].isLoading) return
  if (model.batches[batch.id].people) delete model.batches[batch.id].people
  else getPeople(batch.id)
}

export async function init () {
  await Promise.all([getList(), getMe()])
  Object.assign((await db).transaction(['batches']).objectStore('batches').get('active'), {
    onsuccess: async event => {
      const batches = event.target.result || [model.me.batch.id]
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
