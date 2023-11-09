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
    'https://st-blogs-0.web.app'
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
  jwt.verify(token, process.env.SECRET_TOKEN, (error, decoded) => {
    if (error) {
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

    const database = client.db("stDevs");
    const blogsCollection = database.collection("blogs");
    const commentsCollection = database.collection("comments");
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
      console.log('logging out', user);
      res
        .clearCookie('token', { maxAge: 0, sameSite: 'none', secure: true })
        .send({ success: true })
   })

    // Write code here

    app.get('/blogs', async (req, res) => {
        const cursor = blogsCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.post('/blogs', async (req, res) => {
        const addBlog = req.body;
        const result = await blogsCollection.insertOne(addBlog);
        res.send(result);
    });

    app.get('/blogs/:id', async(req, res) => {
        const id = req.params.id
        const query = { _id: new ObjectId(id) };
        const result = await blogsCollection.findOne(query);
        res.send(result);
    });    

    app.put('/blogs/:id', async (req, res) => {
        const id = req.params.id;
        const filter = {_id: new ObjectId(id) };
        const options = {upsert: true };
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

    app.get('/comments', async (req, res) => {
        const cursor = commentsCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.post('/comments', async (req, res) => {
        const addBlog = req.body;
        const result = await commentsCollection.insertOne(addBlog);
        res.send(result);
    });


    app.get('/wishlist', logger, verifyToken, async (req, res) => {
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