const crypto = require('crypto');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');


// @desc    Register User
// @route   POST /api/v1/auth/register
// @acess   Public
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password, role } = req.body;

    // create user
    const user = await User.create({
        name, 
        email,
        password,
        role
    });

    // create token
    sendTokenResponse(user, 200, res)
})



// @desc    login User
// @route   POST /api/v1/auth/login
// @acess   Public
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // validate email & pasword
    if(!email || !password) {
        return next(new ErrorResponse('Please provide and email and password', 400));
    }

    // check for user
    const user = await User.findOne({ email }).select('+password');

    if(!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // check if password match
    const isMatch = await user.matchPassword(password);

    if(!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // create token
    sendTokenResponse(user, 200, res)
});

// @desc    logout / clear cookies
// @route   GET /api/v1/auth/logout
// @acess   Private
exports.logout = asyncHandler(async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    })

    res.status(200).json({
        success: true,
        data: {}
    })
});


// @desc    get current login user
// @route   POST /api/v1/auth/me
// @acess   Private
exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true,
        data: user
    })
});


// @desc    update user details
// @route   PUT /api/v1/auth/updatedetails
// @acess   Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
    const fieldsToUpdate = {
        name: req.body.name,
        email: req.body.email
    }
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: user
    })
});

// @desc    update password
// @route   PUT /api/v1/auth/updatepassword
// @acess   Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');

    // check current password
    if(!(await user.matchPassword(req.body.currentPassword))) {
        return next(new ErrorResponse('Password is incorrect', 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
});



// @desc    forget password
// @route   POST /api/v1/auth/forgetpassword
// @acess   Public
exports.forgetPassword = asyncHandler(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });

    if(!user) {
        return next(new ErrorResponse('There is user with that email', 404))
    }

    // get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // create reset url
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/resetpassword/${resetToken}`;

    const message = `you receiving this email because you has request the reset of password, \n \n ${resetUrl}`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password reset token',
            message
        });

        res.status(200).json({ success: true, data: 'Email sent'})
    } catch (err) {
        console.log(err);
        user.getResetPasswordToken = undefined;
        user.getResetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });

        return next(new ErrorResponse('Email could not be sent', 500))
    }

    res.status(200).json({
        success: true,
        data: user
    })
});


// @desc    reset password
// @route   PUT /api/v1/auth/restpassword/:resettoken
// @acess   Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    // get hash token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resettoken)
        .digest('hex');
    

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if(!user) {
        return next(new ErrorResponse('invalid token', 400))
    }

    // set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

   // create token
   sendTokenResponse(user, 200, res)
});

// Get token from model, create cookie and send respon
const sendTokenResponse = (user, statusCode, res) => {
    // create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if(process.env.NODE_ENV === 'productions') {
        options.secure = true;
    }

    res
        .status(statusCode)
        .cookie('token', token, options)
        .json({ 
            success: true,
            token
        })
};

