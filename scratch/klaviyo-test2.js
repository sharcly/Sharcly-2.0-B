const klaviyo = require('klaviyo-api');
const session = new klaviyo.GlobalApiKeySession('test-api-key');
const eventsApi = new klaviyo.EventsApi(session);
console.log("eventsApi", !!eventsApi);
console.log("methods", Object.keys(eventsApi));
