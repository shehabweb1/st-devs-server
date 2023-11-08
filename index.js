const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const {
  MongoClient,
  ServerApiVersion,
  ObjectId
} = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://st-blogs-0.web.app',
    'https://st-blogs-0.firebaseapp.com',
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const logger = (req, res, next) => {
  console.log('log: info', req.method, req.url);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({
      message: 'unauthorized access'
    })
  }
  jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        message: 'unauthorized access'
      })
    }
    req.user = decoded;
    next();
  })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@learning.axf2sgn.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const database = client.db("stDevs");
    const blogsCollection = database.collection("blogs");
    const wishlistCollection = database.collection("wishlist");

    // JSON Web Tokens
    app.post('/jwt', logger, async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_TOKEN, {
        expiresIn: '1h'
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
      .send({
        success: true
      });
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      res.clearCookie('token', {
        maxAge: 0
      }).send({
        success: true
      })
    })

    // Write code here
    app.get('/blogs', async (req, res) => {
      const filter = req.query;
      const query = {
        title: {
          $regex: filter.search,
          $options: 'i'
        }
      };
      const options = {
        sort: {
          price: filter.sort === 'asc' ? 1 : -1
        }
      };
      const cursor = serviceCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/blogs', async (req, res) => {
      const addBlog = req.body;
      const result = await blogsCollection.insertOne(addBlog);
      res.send(result);
    });

    app.get('/blogs/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      };
      const options = {
        projection: { title: 1, image: 1, blog_id: 1, category: 1, shortDesc: 1, postDate: 1  },
      };
      const result = await blogsCollection.findOne(query, options);
      res.send(result);
    });

    app.put('/blogs/:id', async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: new ObjectId(id)
      };
      const options = {
        upsert: true
      };
      const blog = req.body;

      const updatedBlog = {
        $set: {
          title: blog.title,
          image: blog.image,
          category: blog.category,
          shortDesc: blog.shortDesc,
          longDesc: blog.longDesc,
        }
      }
      const result = await blogsCollection.updateOne(filter, updatedBlog, options);
      res.send(result);
    });


    app.get('/wishlist', async (req, res) => {
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const cursor = wishlistCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/wishlist', async (req, res) => {
      const addWishlist = req.body;
      const result = await wishlistCollection.insertOne(addWishlist);
      res.send(result);
    });


    app.delete('/wishlist/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      }
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    })


    await client.db("admin").command({
      ping: 1
    });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send(`Welcome to our server`)
})

app.listen(port, (req, res) => {
  console.log(`ST Dev's server is running: ${port}`)
});