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

exports.quoteList = async (token) => {
    try {
        console.log("Quote list start")
        const config = {
            method: 'get',
            url: 'https://api.hubapi.com/crm/v3/objects/quotes',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        };
        const {data:{results}} = await axios(config);
        console.log("Quote list end")
        return results;
    } catch (error) {
        console.log(error);
        return {from: '(helper/hubspotAuth/quoteList) Function Error :- ', message: error};
    }
}

exports.quoteTemplateList = async (token) => {
    try {
        console.log("Quote Template list start")
        const config = {
            method: 'get',
            url: 'https://api.hubapi.com/crm/v3/objects/quote_template?properties=hs_name,hs_active',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        };
        const {data:{results}} = await axios(config);
        console.log("Quote Template  list end")
        return results;
    } catch (error) {
        console.log(error);
        return {from: '(helper/hubspotAuth/quoteTemplateList) Function Error :- ', message: error};
    }
}

exports.assosiateDealToContact = async (id,token) => {
    try {
        console.log("Deal to contact assocition list start")
        const config = {
            method: 'get',
            url: 'https://api.hubapi.com/crm/v3/objects/deals/'+id+'/associations/contacts',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        };
        const {data:{results}} = await axios(config);
        console.log("Deal to contact assocition list end")
        return results;
    } catch (error) {
        console.log(error);
        return {from: '(helper/hubspotAuth/assosiateDealToContact) Function Error :- ', message: error};
    }
}

exports.associationTypeId = async (obj,objId, assObj,assId,token) => {
    let TypeID = '';
    let Assosiationlabel = await this.assosiationLabel(obj,objId,assObj,token);
    // console.log(obj +' to '+assObj+' Assosiationlabel',JSON.stringify(dealAssosiationlabel));
    if (Assosiationlabel.length < 1) {
        Assosiationlabel = await this.createAssosiationLabel(obj,objId,assObj,assId,token)
    }
    for (var i = 0; i < Assosiationlabel.length; i++) {
        let AssTypeItem = Assosiationlabel[i].associationTypes;
        if (TypeID) {
            break;
        }
        for (var j = 0; j < AssTypeItem.length; j++) {
            if(AssTypeItem[j].category === 'HUBSPOT_DEFINED'){
                TypeID = AssTypeItem[j].typeId;
            }
            if (TypeID) {
                break;
            }
        }
    }
    return TypeID;
}

exports.createQuoteById = async (id,user, lineItemRes,title="New Quote") => {
    try {
        console.log("Create quote by quote template id start")
        let {results:lineItems} = lineItemRes;
        let quoteAssosiation = [];
        let templateId = user.quoteTemplateId;
        let quoteData = { "properties" :{
            hs_title: title,
            hs_expiration_date: "2023-12-12"
        }};
        
        let assosiateDealToContact = await this.assosiateDealToContact(id,user.hubspotAccessToken);
        // console.log('assosiateDealToContact list',assosiateDealToContact);

        const quoteListData = await this.quoteList(user.hubspotAccessToken);
        // console.log('quotes list',quoteListData);

        const quoteTemplateListData = await this.quoteTemplateList(user.hubspotAccessToken);
        // console.log('quotes Template list',quoteListData);

        if(quoteTemplateListData.length > 0 ){
            quoteTemplateListData.map(async (template,index) =>{
                const {properties} = template;
                if(!templateId && properties.hs_name === 'Basic'){
                    templateId = template.id
                }
                if(!templateId && quoteTemplateListData.length === index){
                    templateId = template.id
                }
            })         
        }

        if(lineItems.length > 0 && templateId){
            // Deal Assosiation Start
            let dealAssosiationlabel = await this.assosiationLabel('quotes',quoteListData[0].id,'deals',user.hubspotAccessToken);
            // console.log('Quote to deal Assosiation label',JSON.stringify(dealAssosiationlabel));
            if (dealAssosiationlabel.length < 1) {
                if (assosiateDealToContact.length > 0) {
                    console.log('Assosiation quote to deal');
                    await this.createAssosiationLabel('quotes',quoteListData[0].id,'deals',id,user.hubspotAccessToken)
                }
            }

            // let dealAssosiationID = await this.associationTypeId('quotes',quoteListData[0].id,'deals',id,user.hubspotAccessToken);
            // console.log('dealAssosiationID',dealAssosiationID);

            quoteAssosiation.push({
                "to": { "id": id },
                "types": [{
                    "associationCategory": "HUBSPOT_DEFINED",
                    "associationTypeId": 64
                }]
            });


            // Contact Assosiation Start
            let contactAssosiationlabel = await this.assosiationLabel('quotes',quoteListData[0].id,'contacts',user.hubspotAccessToken);
            // console.log('Quote to contact Assosiation label',JSON.stringify(contactAssosiationlabel));
            if (dealAssosiationlabel.length < 1) {
                if (quoteListData.length > 0 && assosiateDealToContact.length > 0) {
                    console.log('Assosiation quote to contact');
                    await this.createAssosiationLabel('quotes',quoteListData[0].id,'deals',assosiateDealToContact[0].id,user.hubspotAccessToken)
                }
            }
            if (assosiateDealToContact.length > 0) {
                assosiateDealToContact.map(async (contact) =>{         //contact assosiate
                    let ass = {
                        "to": { "id": contact.id },
                        "types": [{
                            "associationCategory": "HUBSPOT_DEFINED",
                            "associationTypeId": 69
                        }]
                      };
                      quoteAssosiation.push(ass);
                })
            }



            // Quote Template Assosiation Start
            let templateAssosiationlabel = await this.assosiationLabel('quotes',quoteListData[0].id,'quote_template',user.hubspotAccessToken);
            // console.log('Quote to quote template Assosiation label',JSON.stringify(templateAssosiationlabel));
            if (templateAssosiationlabel.length < 1) {
                if (quoteTemplateListData.length > 0 && templateId) {
                    console.log('Assosiation quote to quote_template');
                    await this.createAssosiationLabel('quotes',quoteListData[0].id,'quote_template',templateId,user.hubspotAccessToken)
                }
            }
            quoteAssosiation.push({
                "to": { "id": templateId },   
                "types": [{
                    "associationCategory": "HUBSPOT_DEFINED",
                    "associationTypeId": 286
                }]
            })

            // Line Item Assosiation Start 
            let lineItemAssosiationlabel = await this.assosiationLabel('quotes',quoteListData[0].id,'line_items',user.hubspotAccessToken);
            // console.log('Quote to line items Assosiation label',JSON.stringify(lineItemAssosiationlabel));
            if (lineItemAssosiationlabel.length < 1) {
                if (quoteListData.length > 0 && lineItems.length > 0) {
                    console.log('Assosiation quote to line items');
                    await this.createAssosiationLabel('quotes',quoteListData[0].id,'line_items',lineItems[0].id,user.hubspotAccessToken)
                }
            }
            lineItems.map(async (lineItem) =>{
                let ass = {
                    "to": {
                      "id": lineItem.id
                    },
                    "types": [{
                        "associationCategory": "HUBSPOT_DEFINED",
                        "associationTypeId": 67
                    }]
                  };
                  quoteAssosiation.push(ass);
            })

            quoteData.associations = quoteAssosiation;
            // console.log('quoteData',JSON.stringify(quoteData));

            const quoteConfig = {
                method: 'post',
                url: 'https://api.hubapi.com/crm/v3/objects/quotes',
                headers: {
                    Authorization: `Bearer ${user.hubspotAccessToken}`,
                    'Content-Type': 'application/json'
                },
                data:quoteData,
            };
            const {data:quoteRes} = await axios(quoteConfig);
            // console.log('quote res',quoteRes);

            const quoteUpdateConfig = {
                method: 'PATCH',
                url: 'https://api.hubapi.com/crm/v3/objects/quotes/'+quoteRes.id,
                headers: {
                    Authorization: `Bearer ${user.hubspotAccessToken}`,
                    'Content-Type': 'application/json'
                },
                data:JSON.stringify({
                    "properties":{
                        "hs_status":"DRAFT"
                    }
                }),
            };
            const {data:quoteUpdateRes} = await axios(quoteUpdateConfig);
            console.log('quote update res',quoteUpdateRes);
        }else{
            console.log({error: true, message: "Template Not Found or Line Items Note Found"});
        }
        console.log("Create quote by quote template id end")
    } catch (error) {
        console.log(JSON.stringify(error));
        return {from: '(helper/hubspotAuth/createQuoteById) Function Error :- ', message: error};
    }
}


exports.assosiationLabel = async (obj,objid,ass,token) => {
    try{
        const config = {
            method: 'get',
            url: `https://api.hubapi.com/crm/v4/objects/${obj}/${objid}/associations/${ass}`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        let {data:{results}} = await axios(config);
        return results
    } catch (error) {
        console.log(error);
        return {from: '(helper/hubspotAuth/assosiationLabel) Function Error :- ', message: error};
    }
}

exports.createAssosiationLabel = async (obj,objId,ass,assId,token) => {
    try{
        const config = {
            method: 'put',
            url: `https://api.hubapi.com/crm/v4/objects/${obj}/${objId}/associations/default/${ass}/${assId}`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        let {data} = await axios(config);
        console.log('createAssosiationLabel',data);
        return data
    } catch (error) {
        console.log(error);
        return {from: '(helper/hubspotAuth/createAssosiationLabel) Function Error :- ', message: error};
    }
}