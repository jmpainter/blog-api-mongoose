const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const { PORT, DATABASE_URL } = require('./config');
const { Post } = require ('./models');

mongoose.Promise = global.Promise;

const app = express();
const jsonParser = bodyParser.json();

app.use(morgan('common'));

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
        res.status(404).json({message: 'Post not found'});
      } else {
        res.json(post.serialize())
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    });
});

app.post('/posts', jsonParser, (req, res) => {
  const requiredFields = ['title', 'author', 'content'];
  for(let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if(!(field in req.body)) {
      const message = `Missing ${field} in request body`;
      console.error(message);
      res.status(400).send(message);
    }
  }

  Post
    .create({
      title: req.body.title,
      // author: {
      //   firstName: req.body.author.firstName,
      //   lastName: req.body.author.lastName
      // },
      author: req.body.author,
      content: req.body.content,
      created: req.body.created
    })
    .then(post => res.status(201).json(post.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    });
});

app.put('/posts/:id', jsonParser, (req, res) => {
  if(req.body.id !== req.params.id) {
    const message = `Request path id ${req.params.id} and request body id ${req.body.id} must match`;
    console.error(message);
    return res.status(400).json({message: message});
  }

  Post
    .findByIdAndUpdate(req.params.id, {$set: req.body}, {new: true})
    .then(post => res.status(200).json(post.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    });
});

app.delete('/posts/:id', (req, res) => {
  Post
    .findByIdAndRemove(req.params.id)
    .then(post => {
      if(post === null) {
        res.status(404).json({message: 'Not Found'});
      } else {
        res.status(204).end()
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    })
});

app.use('*', (req, res) => {
  res.status(404).json({message: 'Not Found'});
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

