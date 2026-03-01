/*
*
*
*       Complete the API routing below
*       
*       
*/

'use strict';

module.exports = function (app) {
  const books = [];

  const createId = () => {
    return (
      Date.now().toString(16) + Math.random().toString(16).slice(2)
    );
  };

  app.route('/api/books')
    .get(function (req, res){
      //response will be array of book objects
      //json res format: [{"_id": bookid, "title": book_title, "commentcount": num_of_comments },...]
      const booksWithCommentCount = books.map(function (book) {
        return {
          _id: book._id,
          title: book.title,
          commentcount: book.comments.length
        };
      });

      res.json(booksWithCommentCount);
    })
    
    .post(function (req, res){
      let title = req.body.title;
      //response will contain new book object including atleast _id and title
      if (!title) {
        return res.send('missing required field title');
      }

      const newBook = {
        _id: createId(),
        title: title,
        comments: []
      };

      books.push(newBook);

      return res.json({
        _id: newBook._id,
        title: newBook.title
      });
    })
    
    .delete(function(req, res){
      //if successful response will be 'complete delete successful'
      books.length = 0;
      res.send('complete delete successful');
    });



  app.route('/api/books/:id')
    .get(function (req, res){
      let bookid = req.params.id;
      //json res format: {"_id": bookid, "title": book_title, "comments": [comment,comment,...]}
      const book = books.find(function (entry) {
        return entry._id === bookid;
      });

      if (!book) {
        return res.send('no book exists');
      }

      return res.json(book);
    })
    
    .post(function(req, res){
      let bookid = req.params.id;
      let comment = req.body.comment;
      //json res format same as .get
      if (!comment) {
        return res.send('missing required field comment');
      }

      const book = books.find(function (entry) {
        return entry._id === bookid;
      });

      if (!book) {
        return res.send('no book exists');
      }

      book.comments.push(comment);
      return res.json(book);
    })
    
    .delete(function(req, res){
      let bookid = req.params.id;
      //if successful response will be 'delete successful'
      const bookIndex = books.findIndex(function (entry) {
        return entry._id === bookid;
      });

      if (bookIndex === -1) {
        return res.send('no book exists');
      }

      books.splice(bookIndex, 1);
      return res.send('delete successful');
    });
  
};
