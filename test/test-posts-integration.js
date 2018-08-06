'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;
chai.use(require('chai-datetime'));

const { Post, Author } = require('../models');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

let testAuthor = {};

function seedPostData() {
  console.log('Seeding Database...');
  const seedPostData = [];
  const seedAuthorData = [];

  for(let i = 0; i < 3; i++) {
    seedAuthorData.push(generateAuthorData());
  }
  return Author.insertMany(seedAuthorData)
    .then(data => {
      testAuthor = data[0];
      for(let i = 0; i < 10; i++) {
        seedPostData.push(generatePostData(testAuthor._id));
      }
      return Post.insertMany(seedPostData);
    });
}

function generatePostData(author_id) {
  const newPost =  {
    title: faker.random.words(3),
    author: author_id,
    content: faker.lorem.sentences(),
    created: faker.date.recent(),
    comments: []
  };
  return newPost;
}

function generateAuthorData() {
  const newAuthor =  {
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    userName: faker.internet.userName()
  };
  return newAuthor;
}


function tearDownDb() {
  console.warn('Deleting database...');
  return mongoose.connection.dropDatabase();
}

describe('Blog Posts API tests', function() {
  before(() => runServer(TEST_DATABASE_URL));
  beforeEach(() => seedPostData());
  afterEach(() => tearDownDb());
  after(() => closeServer());

  describe('GET endpoint', function() {

    it('should return all existing posts', function() {

      let result;

      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          // so subsequent .then blocks can access response object
          result = res;
          expect(result).to.have.status(200);
          // otherwise our db seeding didn't work
          console.log('result.body: ' + result.body);
          expect(result.body).to.have.lengthOf.at.least(1);
          return Post.count();
        })
        .then(function(count) {
          expect(result.body).to.have.lengthOf(count);
        });
    });

    it('should return posts with the correct fields', function() {
      let resPost;

      return chai.request(app)
        .get('/posts')
        then(function(res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length.at.least(1);

          res.body.forEach(function(post) {
            expect(post).to.be.a('object');
            expect(post).to.include.keys(
              'id', 'title', 'author', 'content');
          });
          resPost = res.body[0];
          return Post.findById(resPost.id);
        })
        .then(function(post) {
          expect(post.id).to.equal(resPost.id);
          expect(post.title).to.equal(resPost.title);
          expect(post.author).to.deep.equal(resPost.author);
          expect(post.content).to.equal(resPost.content);
          expect(post.created).to.equal(resPost.created);
        });
    });
  });

  describe('POST endpoint', function() {
    it('should add a new post', function () {

      const newPost = generatePostData(testAuthor._id);

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id', 'title', 'author', 'content');
          expect(res.body.title).to.equal(newPost.title);
          expect(res.body.author).to.equal(testAuthor.firstName + ' ' + testAuthor.lastName);
          expect(res.body.content).to.equal(newPost.content);
          return Post.findById(res.body.id);
        })
        .then(function(post) {
          expect(post.title).to.equal(newPost.title);
          expect(post.author.firstName).to.equal(testAuthor.firstName);
          expect(post.author.lastName).to.equal(testAuthor.lastName);
          expect(post.content).to.equal(newPost.content);
        });
    });
  });

  describe('PUT endpoint', function() {
    it('should upate fields that are sent', function() {
      const updateData = {
        title: 'New Title',
        content: 'New Content'
      };

      return Post
        .findOne()
        .then(function (post) {
          updateData.id = post.id;

          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData)
        })
        .then(function (res) {
          expect(res).to.have.status(201);

          return Post.findById(updateData.id);
        })
        .then(function(post) {
          expect(post.title).to.equal(updateData.title);
          expect(post.content).to.equal(updateData.content);
        });
    });
  });

  describe('DELETE endpoint', function() {
    it('should delete a post by id', function() {
      let post;

      return Post
        .findOne()
        .then(function(foundPost) {
          post = foundPost;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(function (res) {
          expect(res).to.have.status(204);
          return Post.findById(post.id);
        })
        .then(function (post) {
          expect(post).to.be.null;
        });
    });
  });
});