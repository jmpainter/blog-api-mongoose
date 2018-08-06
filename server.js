const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const { PORT, DATABASE_URL } = require('./config');
const { Post, Author } = require ('./models');

mongoose.Promise = global.Promise;

const app = express();
const jsonParser = bodyParser.json();

app.use(morgan('common'));

// /posts route

app.get('/posts', (req, res) => {
  Post
    .find()
    .then(posts => {
      res.json(posts.map(post => post.serialize()));
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: 'Internal server rrror' });
    });
});

app.get('/posts/:id', (req, res) => {
  Post
    .findById(req.params.id)
    .populate('comment')
    .then(post => {
      if(post === null) {
        res.status(404).json({ message: 'Post not found' });
      } else {
        res.json(post.serialize())
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    });
});

app.post('/posts', jsonParser, (req, res) => {
  const requiredFields = ['title', 'author', 'content'];
  let author;

  for(let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if(!(field in req.body)) {
      const message = `Missing ${field} in request body`;
      console.error(message);
      res.status(400).send(message);
    }
  }

  Author.findById(req.body.author)
    .then(_author => {
      author = _author;
      if(!author) {
        return Promise.reject({
          code: 404,
          reason: 'AccessError',
          message: 'Author does not exist'
        });
      } else {
        return Post
          .create(req.body)
      }
    })
    .then(post => {
      console.log(post);
      res.status(201).json({
        id: post.id,
        author: `${author.firstName} ${author.lastName}`,
        content: post.content,
        title: post.title,
        comments: post.comments
      })
    })
    .catch(err => {
      console.error(err);
      if (err.reason === 'AccessError') {
        return res.status(err.code).json(err);
      }
      res.status(500).json({message: 'Internal Server Error'});
    });
});

app.put('/posts/:id', jsonParser, (req, res) => {
  if(req.body.id !== req.params.id) {
    const message = `Request path id ${req.params.id} and request body id ${req.body.id} must match`;
    console.error(message);
    return res.status(400).json({message: message});
  }

  const toUpdate = {};
  const updateableFields = ['title', 'content'];

  updateableFields.forEach(field => {
    if(field in req.body) {
      toUpdate[field] = req.body[field];
    }
  })

  Post
    .findByIdAndUpdate(req.params.id, { $set: toUpdate }, { new: true })
    .populate('author')
    .then(post => {
      res.status(201).json(post.serialize())
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    });
});

app.delete('/posts/:id', (req, res) => {
  Post
    .findByIdAndRemove(req.params.id)
    .then(post => {
      if(!post) {
        res.status(404).json({ message: 'Not Found' });
      } else {
        res.status(204).end()
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    })
});

// /authors route

app.post('/authors', jsonParser, (req, res) => {
  const requiredFields = ['firstName', 'lastName', 'userName'];

  for(let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if(!(field in req.body)) {
      const message = `Missing ${field} in request body`;
      console.error(message);
      res.status(400).send(message);
    }
  }

  Author
    .find({ userName: req.body.userName })
    .then(author => {
      if(author.length > 0) {
        return Promise.reject({
          code: 400,
          reason: 'CreateError',
          message: 'That username is already taken'
        });
      } else {
        return Author.create(req.body);
      }
    })
    .then(author => {
      res.status(201).json({
        _id: author._id,
        name: author.firstName + ' ' + author.lastName,
        userName: author.userName
      })
    })
    .catch(err => {
      console.error(err);
      if (err.reason === 'CreateError') {
        res.status(err.code).json(err);
      } else {
        res.status(500).json({messasge: 'Internal Server Error'});
      }
    });
});

app.put('/authors/:id', jsonParser, (req, res) => {

  if(req.body.id !== req.params.id) {
    const message = `Request path id ${req.params.id} and request body id ${req.body.id} must match`;
    console.error(message);
    return res.status(400).json({message: message});
  }

  const toUpdate = {};
  const updateableFields = ['firstName', 'lastName', 'userName'];

  updateableFields.forEach(field => {
    if(field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });
  Author.findByIdAndUpdate(req.params.id, { $set: toUpdate }, { new: true })
    .then(author => {
      res.status(200).json({
        _id: author._id,
        name: author.firstName + ' ' + author.lastName,
        userName: author.userName
      })
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    });
});

app.delete('/authors/:id', (req, res) => {
  Author.findByIdAndRemove(req.params.id)
    .then(author => {
      if(!author) {
        return Promise.reject({
          code: 404,
          reason: 'DeleteError',
          message: 'Author does not exist'
        });
      } else {
        return Post.remove({author: author._id})
      }
    })
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      console.error(err);
      if(err.reason === 'DeleteError') {
        res.status(404).json(err);
      } else {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });
})

app.use('*', (req, res) => {
  res.status(404).json({message: 'Not Found'});
});

let server;

function runServer(databaseUrl, port = PORT) {
  console.log('runServer called');
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
  return mongoose.disconnect().then(() => {
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

