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
