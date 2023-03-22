const {User} = require('../model/user');

exports.requireConnectCrmCard = async (req, res, next) => {
    try {
        if (req.query.portalId) {
            const user = await User.findOne({hubspotPortalId: req.query.portalId})
            if (! user) {
                return res.json({
                    "primaryAction": {
                        "type": "IFRAME",
                        "width": 1000,
                        "height": 850,
                        "uri": process.env.HOST + '/hubspot/connect',
                        "label": "Re-Connect Hubspot"
                    },
                    "secondaryAction": []
                })
            }
            if (! user.sumoquoteRefreshToken && ! user.sumoquoteAPIKEY) {
                return res.json({
                    "primaryAction": {
                        "type": "IFRAME",
                        "width": 1000,
                        "height": 850,
                        "uri": process.env.HOST + '/sumoquote/connect?id=' + user._id,
                        "label": "Connect to Sumoquote"
                    },
                    "secondaryAction": []
                })
            }
            req.user = user;
            next();
        } else {
            return res.status(400).json({message: "Hubspot PortalId required!"});
        }
    } catch (error) {
        return res.status(400).json({from: '(common-middelware/index/requireConnect) function Error :- ', message: error.message});
    }
}

exports.requiredAuth = async (req, res, next) => {
    try {
        if (req.query.portalId) {
            const user = await User.findOne({hubspotPortalId: req.query.portalId})
            if (! user || ! user.hubspotPortalId || ! user.hubspotRefreshToken) {
                console.log("Hubspot Not Connected");
                return res.redirect('/hubspot/connect');
            }
            if (! user.sumoquoteRefreshToken && ! user.sumoquoteAPIKEY) {
                console.log("Sumoquote Not Connected");
                return res.redirect('/sumoquote/connect?id=' + user.hubspotUserId);
            }
            req.user = user;
            next();
        } else {
            return res.status(400).json({message: "Hubspot PortalId required!"});
        }
    } catch (error) {
        return res.status(400).json({from: '(common-middelware/index/requiredAuth) function Error :- ', message: error.message});
    }
}


exports.isTokenExpired = async (date) => {
    return date < new Date();
};

exports.getExpiry = async (expiresIn) => {
    const expiryDate = Date.now() + (expiresIn - 60) * 1000;
    return new Date(expiryDate);
}

exports.checkPropertyObj = async (obj, property) => {
    if (typeof obj[property] !== 'undefined' && obj[property] !== null && obj.hasOwnProperty(property) && obj[property]) 
        return true
     else 
        return false
}
