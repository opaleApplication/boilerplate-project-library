/*
*
*
*       Complete the API routing below
*       
*       
*/

'use strict';

const { MongoClient, ObjectId } = require('mongodb');

module.exports = function (app) {
  const useMemoryStore = !process.env.DB;
  const memoryBooks = [];
  let booksCollectionPromise;

  const createMemoryId = function () {
    return Date.now().toString(16) + Math.random().toString(16).slice(2);
  };

  const normalizeBook = function (book) {
    return {
      _id: String(book._id),
      title: book.title,
      comments: Array.isArray(book.comments) ? book.comments : []
    };
  };

  const getCollection = function () {
    if (!booksCollectionPromise) {
      const client = new MongoClient(process.env.DB);
      booksCollectionPromise = client.connect()
        .then(function () {
          return client.db().collection('books');
        })
        .catch(function (error) {
          booksCollectionPromise = null;
          throw error;
        });
    }

    return booksCollectionPromise;
  };

  const getObjectId = function (bookid) {
    if (!ObjectId.isValid(bookid)) {
      return null;
    }

    return new ObjectId(bookid);
  };

  const listBooks = async function () {
    if (useMemoryStore) {
      return memoryBooks.map(function (book) {
        return {
          _id: book._id,
          title: book.title,
          commentcount: book.comments.length
        };
      });
    }

    const booksCollection = await getCollection();
    const books = await booksCollection
      .find({}, { projection: { title: 1, comments: 1 } })
      .toArray();

    return books.map(function (book) {
      return {
        _id: String(book._id),
        title: book.title,
        commentcount: Array.isArray(book.comments) ? book.comments.length : 0
      };
    });
  };

  const createBook = async function (title) {
    if (useMemoryStore) {
      const book = {
        _id: createMemoryId(),
        title: title,
        comments: []
      };

      memoryBooks.push(book);

      return {
        _id: book._id,
        title: book.title
      };
    }

    const booksCollection = await getCollection();
    const result = await booksCollection.insertOne({
      title: title,
      comments: []
    });

    return {
      _id: String(result.insertedId),
      title: title
    };
  };

  const deleteAllBooks = async function () {
    if (useMemoryStore) {
      memoryBooks.length = 0;
      return;
    }

    const booksCollection = await getCollection();
    await booksCollection.deleteMany({});
  };

  const getBookById = async function (bookid) {
    if (useMemoryStore) {
      const book = memoryBooks.find(function (entry) {
        return entry._id === bookid;
      });

      if (!book) {
        return null;
      }

      return normalizeBook(book);
    }

    const objectId = getObjectId(bookid);
    if (!objectId) {
      return null;
    }

    const booksCollection = await getCollection();
    const book = await booksCollection.findOne({ _id: objectId });

    if (!book) {
      return null;
    }

    return normalizeBook(book);
  };

  const addComment = async function (bookid, comment) {
    if (useMemoryStore) {
      const book = memoryBooks.find(function (entry) {
        return entry._id === bookid;
      });

      if (!book) {
        return null;
      }

      book.comments.push(comment);
      return normalizeBook(book);
    }

    const objectId = getObjectId(bookid);
    if (!objectId) {
      return null;
    }

    const booksCollection = await getCollection();
    const result = await booksCollection.findOneAndUpdate(
      { _id: objectId },
      { $push: { comments: comment } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return null;
    }

    return normalizeBook(result.value);
  };

  const deleteBook = async function (bookid) {
    if (useMemoryStore) {
      const index = memoryBooks.findIndex(function (entry) {
        return entry._id === bookid;
      });

      if (index === -1) {
        return false;
      }

      memoryBooks.splice(index, 1);
      return true;
    }

    const objectId = getObjectId(bookid);
    if (!objectId) {
      return false;
    }

    const booksCollection = await getCollection();
    const result = await booksCollection.deleteOne({ _id: objectId });
    return result.deletedCount === 1;
  };

  app.route('/api/books')
    .get(async function (req, res){
      //response will be array of book objects
      //json res format: [{"_id": bookid, "title": book_title, "commentcount": num_of_comments },...]
      try {
        const books = await listBooks();
        res.json(books);
      } catch (error) {
        res.status(500).send('internal server error');
      }
    })
    
    .post(async function (req, res){
      let title = req.body.title;
      //response will contain new book object including atleast _id and title
      if (!title) {
        return res.send('missing required field title');
      }

      try {
        const book = await createBook(title);
        return res.json(book);
      } catch (error) {
        return res.status(500).send('internal server error');
      }
    })
    
    .delete(async function(req, res){
      //if successful response will be 'complete delete successful'
      try {
        await deleteAllBooks();
        res.send('complete delete successful');
      } catch (error) {
        res.status(500).send('internal server error');
      }
    });



  app.route('/api/books/:id')
    .get(async function (req, res){
      let bookid = req.params.id;
      //json res format: {"_id": bookid, "title": book_title, "comments": [comment,comment,...]}
      try {
        const book = await getBookById(bookid);
        if (!book) {
          return res.send('no book exists');
        }

        return res.json(book);
      } catch (error) {
        return res.status(500).send('internal server error');
      }
    })
    
    .post(async function(req, res){
      let bookid = req.params.id;
      let comment = req.body.comment;
      //json res format same as .get
      if (!comment) {
        return res.send('missing required field comment');
      }

      try {
        const book = await addComment(bookid, comment);
        if (!book) {
          return res.send('no book exists');
        }

        return res.json(book);
      } catch (error) {
        return res.status(500).send('internal server error');
      }
    })
    
    .delete(async function(req, res){
      let bookid = req.params.id;
      //if successful response will be 'delete successful'
      try {
        const deleted = await deleteBook(bookid);
        if (!deleted) {
          return res.send('no book exists');
        }

        return res.send('delete successful');
      } catch (error) {
        return res.status(500).send('internal server error');
      }
    });
  
};
