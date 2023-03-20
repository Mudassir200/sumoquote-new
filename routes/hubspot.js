const router = require('express').Router();
const { getSumoquoteAccessToken } = require( '../helper/sumoquoteAuth');
const {connect, callback, crmCardReport, getObjectData} = require('../controller/hubspot');
const {requireConnectCrmCard} = require('../common-middleware');
const {getHubspotAccessToken} = require('../helper/hubspotAuth');

router.get('/connect', connect);
router.get('/callback', callback);
router.get('/crmCardReport', requireConnectCrmCard, getHubspotAccessToken,getSumoquoteAccessToken, crmCardReport);


module.exports = router;
