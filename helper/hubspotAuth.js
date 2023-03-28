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

exports.getHubspotOwner = async (id, token) => {
    try {
        console.log("Hubspot get owner data start")
        const config = {
            method: 'get',
            url: 'https://api.hubapi.com/crm/v3/owners/'+ id ,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const {data} = await axios(config);
        console.log("Hubspot get owner data end")
        return data;
    } catch (error) {
        return {from: '(helper/hubspotAuth/getHubspotOwner) Function Error :- ', message: error};
    }
}

exports.updateDealdata = async (id, token,dealData) => {
    try {
        console.log("Deal Data update start")
        console.log("Hubspot Deal data update by ObjectId :- " + id)
        const config = {
            method: 'patch',
            url: 'https://api.hubapi.com/crm/v3/objects/deals/' + id,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data:JSON.stringify({"properties":dealData})
        };

        console.log(config);
        const {data} = await axios(config);
        console.log("Deal Data update end")
        return data;
    } catch (error) {
        return {from: '(helper/hubspotAuth/updateDealdata) Function Error :- ', message: error};
    }
}

exports.data = [
    { name: 'Belmont Series Windows', price: 54.17, quantity: 2 },
    {
      name: 'Belmont Standard Exterior Coated Colors',
      price: 204.77,
      quantity: 3
    },
    {
      name: 'Belmont Custom Exterior Colors',
      price: 1257.37,
      quantity: 2
    },
    { name: 'Belmont Extruded Full Screen', price: 25.15, quantity: 1 },
    { name: 'Belmont White Factory Mull', price: 46.7, quantity: 1 },
    { name: 'Belmont Black Factory Mull', price: 56.05, quantity: 1 }
  ];

exports.createLineItems = async (id,token, lineItemData) => {
    try {
        console.log("Create Line Items and assosiate deal start")
        // console.log(data);
        let result = [];
        lineItemData.map(async (item) => {
           let lineItem = {
                "properties" : {...item},
                "associations" : [{
                    "to": {
                        "id": id
                    },
                    "types": [
                        {
                          "associationCategory": "HUBSPOT_DEFINED",
                          "associationTypeId": 20
                        }
                    ]
                }]
           }
           result.push(lineItem);
        })
        // console.log(JSON.stringify(result));
        const config = {
            method: 'post',
            url: 'https://api.hubapi.com/crm/v3/objects/line_items/batch/create',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data:{"inputs":[...result]}
        };
        
        const {data} = await axios(config);
        console.log("Create Line Items and assosiate deal end")
        return data;
    } catch (error) {
        console.log(error);
        return {from: '(helper/hubspotAuth/createLineItems) Function Error :- ', message: error};
    }
}