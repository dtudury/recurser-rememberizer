import { proxy, watchFunction } from './horseless.0.5.1.min.esm.js'
import { db } from './db.js'

export const model = window.model = proxy({
    progress: [],
    batches: {}
})

export function saveActiveBatches() {
    watchFunction(async () => {
        const batchIds = Object.values(model.batches)
            .filter(batch => batch.people)
            .map(batch => batch.id)
        Object.assign((await db).transaction(['batches'], 'readwrite').objectStore('batches').put(batchIds, 'active'), {
            onsuccess: event => {
                console.log('saved active batches', event.target.result)
            }
        })
    })
}

export async function updatePeople() {
    const batchIds = Object.values(model.batches)
        .filter(batch => batch.people)
        .map(batch => batch.id)
    const people = await Promise.all(batchIds.map(id => {
        return new Promise(async (resolve, reject) => {
            Object.assign((await db).transaction(['progress']).objectStore('progress').index('batchId').getAll(id), {
                onsuccess: event => {
                    resolve(event.target.result)
                }
            })
        })
    }))
    model.progress = {}
    people.flat().map(person => {
        model.progress[person.id] = person
    })
}

watchFunction(updatePeople)
