const express = require('express');
const { 
    getBootcamp, 
    getBootcamps, 
    createBootcamp, 
    updateBootcamp, 
    deleteBootcamp,
    getBotcampsInRadius,
    bootcampPhotoUpload
} = require('../controllers/bootcamps');

const Bootcamp = require('../models/Bootcamp')
const advancedResult = require('../middleware/advancedResult');

// Include other resource routers
const courseRouter = require('./courses');
const reviewRouter = require('./reviews');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Reroute into other resource routers
router.use('/:bootcampId/courses', courseRouter);
router.use('/:bootcampId/reviews', reviewRouter);

router.route('/radius/:zipcode/:distance').get(getBotcampsInRadius);

router.route('/:id/photo').put(protect, authorize('publisher', 'admin'), bootcampPhotoUpload)

router.route('/')
    .get(advancedResult(Bootcamp, 'courses') ,getBootcamps)
    .post(protect, authorize('publisher', 'admin'), createBootcamp)

router.route('/:id')
    .get(getBootcamp)
    .put(protect, authorize('publisher', 'admin'), updateBootcamp)
    .delete(protect, authorize('publisher', 'admin'), deleteBootcamp)

module.exports = router;