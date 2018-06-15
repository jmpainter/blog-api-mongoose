'use strict'

const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
  title: {type: String, required: true},
  author: {
    firstName: {type: String, required: true},
    lastName: {type: String, required: true}
  },
  content: {type: String, required: true},
  created: {type: Date, default: Date.now()}
});

postSchema.virtual('authorFullName').get(function() {
  return this.author.firstName + ' ' + this.author.lastName;
});

postSchema.methods.serialize = function() {
  return {
    id: this._id,
    title: this.title,
    author: this.authorFullName,
    content: this.content,
    created: this.created
  }
}

const Post = mongoose.model('Post', postSchema);

module.exports = { Post };