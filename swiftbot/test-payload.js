require('dotenv').config();
const axios = require('axios');
const token = process.env.WHATSAPP_TOKEN;

const payload = {"messaging_product":"whatsapp","recipient_type":"individual","to":"923008607811","type":"interactive","interactive":{"type":"button","body":{"text":"Welcome to Swift Sales, Rahim Yar Khan! How can I help you today? 😊"},"action":{"buttons":[{"type":"reply","reply":{"id":"list_companies","title":"List Companies"}},{"type":"reply","reply":{"id":"browse_categories","title":"Browse Categories"}},{"type":"reply","reply":{"id":"search","title":"Search"}}]}}};

axios.post('https://graph.facebook.com/v21.0/948562421683360/messages', payload, {
    headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    }
}).then(r => console.log('SUCCESS', r.data))
  .catch(e => console.error('ERROR', JSON.stringify(e.response.data, null, 2)));
