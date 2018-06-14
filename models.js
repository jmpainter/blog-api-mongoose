'use strict'

const mongoose = require('mongoose');

const postsSchema = mongoose.Schema({
  title: {type: String, required: true},
  author: {
    firstName: {type: String, required: true},
    lastName: {type: String, required: true}
  },
  content: {type: String, required: true}
});

postsSchema.virtual('authorFullName').get(function() {
  return this.author.firstName + ' ' + this.author.lastName;
});

postsSchema.methods.serialize = function() {
  return {
    id: this._id,
    title: this.title,
    author: this.authorFullName,
    content: this.content
  }
}
