const bcryptjs = require('bcryptjs');
const jsonWebToken = require('jsonwebtoken');
const { validationResult} = require('express-validator');
const { config } = require('dotenv');
const { Pool } = require('pg');


// setup enviroment module
config()

let pgSetup;

if(process.env.HEROKURL){
    pgSetup = {
        connectionString: process.env.HEROKURL
    }  
}else{
    pgSetup = {
        user: process.env.DB_USER,
        host: process.env.HOST,
        database: process.env.DB,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT, 
    }
}
const pool = new Pool(pgSetup);


const users = (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
      res.status(422).json({
        status: 'errors',
        error: errors.array()
      });
    }
    const { firstName, lastName, email, password} = req.body;

    pool.query(`SELECT email FROM todo WHERE email='${email}'`)
    .then((ans) => {
      if (ans.rows.length > 0) {
        res.status(401).json({
          status: 'error',
          error: 'email already exists in db',
        });
      } else {
        // hash password
        bcryptjs.hash(password, 8, (err, hash) => {
          if (err) {
            throw new Error('password hashing failed');
          } else {
            const text = 'INSERT INTO todo (firstName, lastName, email, password) VALUES ($1, $2, $3, $4) RETURNING id, firstName, lastName, email';
            const results = [firstName, lastName, email, hash];
            // Insert into DB
            pool.query(text, results)
              .then((response) => {
                // Sign with JWT
                const token = jsonWebToken.sign(response.rows[0], process.env.PASSWORD);
                // adding token to db result
                response.rows[0].token = token;

                res.cookie('token', token);
                res.status(201).json({
                  status: 'success',
                  data: response.rows[0],
                });
              })
              .catch(() => {
                // send message if there is error
                res.status(400).json({
                  status: 'error',
                  error: 'signup failed',
                });
              });
          }
        });
      }
    })
    .catch(() => {
      res.status(400).json({
        status: 'error',
        error: 'email all ready exists',
      });
    });
};

const login = (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    res.status(422).json({
      status: 'errors',
      error: errors.array()
    });
  }

  const {
    email, password,
  } = req.body;
  const text = `SELECT id, firstname, lastname, email , password FROM todo WHERE email='${email}'`;
  pool.query(text)
    .then((response) => {
      bcryptjs.compare(password, response.rows[0].password)
        .then((value) => {
          if (value) {
            const token = jsonWebToken.sign(email, process.env.PASSWORD);
            res.cookie('token', token);
            res.cookie('user_id', response.rows[0].id);
            const result = {
              status: 'success',
              data: {
                id: response.rows[0].id,
                firstname: response.rows[0].firstname,
                lastname: response.rows[0].lastname,
                email: response.rows[0].email,
                token,
              },
            };

            res.status(200).json(result);
          } else {
            res.status(401).json({
              status: 'error',
              error: 'wrong email or password',
            });
          }
        });
    })
    .catch(() => {
      res.status(401).json({
        status: 'error',
        error: 'user does not exist',
      });
    });
};

const notes = (req, res) => {
  const { user_id, token } = req.cookies;
  const { note, author } = req.body;

  const errors = validationResult(req);
  if(!errors.isEmpty()){
    res.status(422).json({
      status: 'errors',
      error: errors.array()
    });
  }
  if(jsonWebToken.verify(token, process.env.PASSWORD)){
  
    const text = `INSERT INTO notes(note, author, userfk) VALUES ($1, $2, $3) RETURNING note_id, note, author, time`;
    pool.query(text, [note, author, user_id])
    .then(ans =>{
      const text = `SELECT note_id, note, author, time FROM notes WHERE userfk=${user_id}`;
      pool.query(text)
      .then(result => {
        res.status(200).json({
          status: 'success',
          data: result.rows
        });
      })
      .catch( (e) => {
        console.log(e)
        res.status(500).json({
          status: 'error',
          error: "failed to fetch notes" 
        });
      })
    })
    .catch( (e) => {
      console.log(e)
      res.status(500).json({
        status: 'error',
        error: "failed to fetch notes" 
      });
    })
    
  }
  
};

const deleteNote = (req, res) => {
  const { noteId } = req.params;
  const { token, user_id } = req.cookies;
console.log(token)
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    res.status(422).json({
      status: 'errors',
      error: errors.array()
    });
  }
  if(jsonWebToken.verify(token, process.env.PASSWORD)){
    const text = `DELETE FROM notes WHERE note_id=${Number(noteId)} RETURNING *`;
    pool.query(text)
      .then(ans => {
        // select all notes
        const text = `SELECT note_id, note, author, time FROM notes WHERE userfk=${user_id}`;
        pool.query(text)
        .then(result => {
          res.status(200).json({
            status: 'success',
           data: result.rows
          });
        })
        .catch( e => {
          console.log(e);
          res.status(404).json({
            status: 'error',
            error: 'failed to fetch updated notes'
          });
        })

    })
    .catch( e => {
      console.log(e);
      res.status(404).json({
        status: 'error',
        error: 'please login or signup'
      });
    })
  }
  
}

module.exports = { users, login, notes, deleteNote };