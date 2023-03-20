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
                        "label": "ReConnect Hubspot"
                    },
                    "secondaryAction": []
                })
            }
            if (! user.sumoquoteRefreshToken) {
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


exports.isTokenExpired = (date) => {
    return date < new Date();
};

exports.getExpiry = (expiresIn) => {
    const expiryDate = Date.now() + (expiresIn - 60) * 1000;
    return new Date(expiryDate);
}
