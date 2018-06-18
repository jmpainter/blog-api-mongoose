'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;
chai.use(require('chai-datetime'));

const { Post } = require('../models');
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

function seedPostData() {
  console.log('Seeding Post Data...');
  const seedData = [];
  for(let i = 0; i < 10; i++) {
    seedData.push(generatePostData());
  }
  return Post.insertMany(seedData);
}

function generatePostData() {
  const newPost =  {
    title: faker.random.words(3),
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    content: faker.lorem.sentences(),
    created: faker.date.recent()
  };
  return newPost;
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
          expect(result.body.posts).to.have.lengthOf.at.least(1);
          return Post.count();
        })
        .then(function(count) {
          expect(result.body.posts).to.have.lengthOf(count);
        });
    });

    it('should return posts with the correct fields', function() {
      let resPost;

      return chai.request(app)
        .get('/posts')
        then(function(res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body.posts).to.be.a('array');
          expect(res.body.posts).to.have.length.at.least(1);

          res.body.posts.forEach(function(post) {
            expect(post).to.be.a('object');
            expect(post).to.include.keys(
              'id', 'title', 'author', 'content', 'created');
          });
          resPost = res.body.posts[0];
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

      const newPost = generatePostData();

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id', 'title', 'author', 'content', 'created');
          expect(res.body.title).to.equal(newPost.title);
          expect(res.body.author).to.equal(newPost.author.firstName + ' ' + newPost.author.lastName);
          expect(res.body.content).to.equal(newPost.content);
          expect(new Date(res.body.created)).to.equalDate(new Date(newPost.created));
          return Post.findById(res.body.id);
        })
        .then(function(post) {
          expect(post.title).to.equal(newPost.title);
          expect(post.author.firstName).to.equal(newPost.author.firstName);
          expect(post.author.lastName).to.equal(newPost.author.lastName);
          expect(post.content).to.equal(newPost.content);
          expect(new Date(post.created)).to.equalDate(new Date(newPost.created));
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
          expect(res).to.have.status(200);

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