const { getHubspotAccessToken } = require('../helper/hubspotAuth');
const { getSumoquoteAccessToken } = require('../helper/sumoquoteAuth');
const router = require('express').Router();
const { requiredAuth } = require('../common-middleware');
const { connect, disconnect, callback, responseWebhook, createProjectByObjectId } = require('../controller/sumoquote');


router.get('/connect',connect);
router.get('/callback',callback);
router.get('/disconnect',disconnect);
router.post('/webhook/signatory-signed/:sumoquoteWebhookId',requiredAuth,getHubspotAccessToken,getSumoquoteAccessToken,responseWebhook);


router.get('/create-project',requiredAuth,getHubspotAccessToken,getSumoquoteAccessToken,createProjectByObjectId);

module.exports = router;