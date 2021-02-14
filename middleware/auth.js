const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const errorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
    let token;

    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // set token from bearer token in header
        token = req.headers.authorization.split(' ')[1];
    }
    // set token from cookie
    // else if (req.cookies.token) {
    //     token = req.cookies.token
    // }

    // make sure token exist
    if(!token) {
        return next(new errorResponse('Not Authrozied to access this route', 401))
    }

    try {
        // verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.id);

        next();
    } catch (err) {
        return next(new errorResponse('Not Authrozied to access this route', 401))
    }
});

// grant access to spesific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.user.role)) {
             return next(new errorResponse(`user role ${req.user.role} unathorized to access this route`, 403))
        }

        next();
    }
}