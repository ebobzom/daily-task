const express =require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { users, login, notes, deleteNote } = require('./apiGetherAndSetters');
const { check } = require('express-validator');

// app 
const app = express();

const port = process.env.PORT || 3000;

app.use(helmet())
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

// signup
app.post('/api/v1/users', [ 
    check('firstName').isString(), 
    check('lastName').isString(),
    check('email').isEmail(),
    check('password').isString()
    ], 
    users
    );


// signin
app.post('/api/v1/login', [
    check('email').isEmail(),
    check('password').isString()], 
    login
    );
// add note
app.post('/api/v1/notes', [
    check("token").isString(),
    check('user_id').isInt(),
    check('author').isString(),
    check('note').isString()
], notes);

// delete note
app.delete('/api/v1/notes/:noteId', [
    check('noteId').isInt(),
    check('user_id').isInt()
    ], 
    deleteNote
    );


//wrong parts
app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        error: 'page not found'
    });
})

// error handling
app.use((err, req, res, next) => {
    res.status(422).json({
        status: 'error',
        error: err.message
    });
})
app.listen(port, () => console.log(`server running on port ${port}`));




