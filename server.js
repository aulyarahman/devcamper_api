const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const fileupload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
const errorhandler = require('./middleware/error');
const connectDB = require('./config/db');

// Load env var
dotenv.config({ path: './config/config.env' });

// connect to db

connectDB();


//  ROute files
const bootcamp = require('./routes/bootcamps');
const courses = require('./routes/courses');
const auth = require('./routes/auth');
const user = require('./routes/user');
const reviews = require('./routes/reviews');


const app = express();

// Body parser
app.use(express.json());

// cookie parser
app.use(cookieParser());


// Dev logging middleware
if(process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

// file upload
app.use(fileupload());

// Sanitize data
app.use(mongoSanitize());

// set security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// rate limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 mins
    max: 100
});

app.use(limiter);

// prevent http param polution
app.use(hpp());

// enable cors
app.use(cors());

// set static folder
app.use(express.static(path.join(__dirname, 'public')))

// Mount routers
app.use('/api/v1/bootcamp', bootcamp);
app.use('/api/v1/courses', courses);
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', user);
app.use('/api/v1/reviews', reviews);

app.use(errorhandler);

const PORT = process.env.PORT || 5000;


const server = app.listen(PORT, console.log(`server running ${process.env.NODE_ENV} mode port ${PORT}`.yellow.bold));

// Handle undhandle rejections
process.on('unhandledRejection', (err, promose) => {
    console.log(`Error: ${err.message}`.red);
    // close server exit procces
    server.close(() => process.exit(1));
})