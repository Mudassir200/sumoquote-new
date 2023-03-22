const axios = require('axios');
const qs = require('qs');
const {isTokenExpired, getExpiry} = require("../common-middleware");


exports.getHubspotAccessToken = async (req, res, next) => {
    try {
        console.log("Get hubspot access token start")
        const tokenExpired = await isTokenExpired(req.user.hubspotTokenExpiry);
        if (tokenExpired) {
            let response = await this.refreshHubspotAccessToken(req.user)
            if (response?.message !== undefined || response?.message) {
                return res.status(400).json(response);
            }
        }
        console.log("Get hubspot access token end")
        next();
    } catch (error) {
        return res.status(400).json({from: '(helper/hubspotAuth/getHubspotAccessToken) Helper Function Error :- ', message: error.message});
    }
}

exports.refreshHubspotAccessToken = async (user) => {
    try {
        console.log("Refresh hubspot acccess token start")
        let data = qs.stringify({'grant_type': 'refresh_token', 'client_id': process.env.HUBSPOT_CLIENT_ID, 'client_secret': process.env.HUBSPOT_CLIENT_SECRET, 'refresh_token': user.hubspotRefreshToken});
        let config = {
            method: 'post',
            url: 'https://api.hubapi.com/oauth/v1/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data
        };
        const {data: response} = await axios(config)
        user.hubspotAccessToken = response.access_token;
        user.hubspotTokenExpiry = await getExpiry(response.expires_in);
        
        await user.save();
        console.log("updated hubspot access token :- ",response)
        console.log("Refresh hubspot acccess token end")
        return response.access_token;
    } catch (error) {
        return {from: '(helper/hubspotAuth/refreshHubspotAccessToken) Helper Function Error :- ', message: error.message};
    }
}


exports.getHubspotObjectData = async (id, object, token,properties="?") => {
    try {
        console.log("Hubspot get object data start")
        console.log("Hubspot Object:- " + object + " and ObjectId :- " + id)
        const config = {
            method: 'get',
            url: 'https://api.hubapi.com/crm/v3/objects/' + object + '/' + id + properties,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const {data} = await axios(config);
        console.log("Hubspot get object data end")
        return data;
    } catch (error) {
        return {from: '(helper/hubspotAuth/getHubspotObjectData) Function Error :- ', message: error.message};
    }
}
