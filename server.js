const express = require('express');
const mongoose = require('mongoose');
const { PORT, DATABASE_URL } = require('./config');
const { Post } = require ('./models');

mongoose.Promise = global.Promise;

const app = express();

app.get('/posts', (req, res) => {
  Post
    .find()
    .limit(10)
    .then(posts => {
      res.json({
        posts: posts.map(post => post.serialize())
      });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({message: 'Internal server error'});
    });
});

app.get('/posts/:id', (req, res) => {
  Post
    .findById(req.params.id)
    .then(post => {
      if(post === null) {
        res.status(404).send('post not found');
      } else {
        res.json(post.serialize())
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({message: 'Internal server error'});
    });
});

let server;

function runServer(databaseUrl, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
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
        });
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

