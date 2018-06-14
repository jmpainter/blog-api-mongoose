const express = require('express');
const mongoose = require('mongoose');
const {PORT, DATABASE_URL} = require('.config');
const {BlogPosts} = require ('./models');

mongoose.Promise = global.Promise;

const app = express();

app.get('/posts', (req, res) => {
  
});

let server;

function runServer(databaseUrl, port=PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect((databaseUrl, err) => {
      if(err) {
        return reject(err);
      }
      server = app.listen(port, () => {
        console.log(`Your app is listening on port ${port}`);
        resolve();
      })
      .on('error', err => {
        mongoose.disconnect();
        reject(err);
      })
    });
  });
}

function closeServer() {
  return mongoose.disconnect.then(() => {
    return new Promise((resolve, reject) => {
      console.log('Closing server');
      server.close(err => {
        if(err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

if(require.main === module) {
  runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = { app, runServer, closeServer };

