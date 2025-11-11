const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@sajib43.hq7hrle.mongodb.net/?appName=Sajib43`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


app.get('/', (req, res) => {
    res.send('MovieMaster Pro server is running')
})

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const db = client.db('movie_master_pro_db');
        const moviesCollection = db.collection('movies');
        const usersCollection = db.collection('users')


        // Movies APIs
        app.get('/movies', async (req, res) => {
            const cursor = moviesCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        //   Create Movies Info
        app.post('/movies', async (req, res) => {
            const newMovie = req.body;
            const result = await moviesCollection.insertOne(newMovie);
            res.send(result);
        })

        //   Find Specific/One Movie
        app.get('/movies/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await moviesCollection.findOne(query)
            res.send(result)
        })

        // Users APIS
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const email = req.body.email;
            const query = { email: email }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                res.send({ Message: 'User Already Exist' })
            }
            else {
                const result = await usersCollection.insertOne(newUser);
                res.send(result);
            }

        })

        // Stats
        app.get('/stats', async (req, res) => {
            const totalMovies = await moviesCollection.estimatedDocumentCount();
            const totalUsers = await usersCollection.estimatedDocumentCount();
            const result = { totalMovies, totalUsers };
            res.send(result)
        })

        // Top-Rated Movies
        app.get('/top-rated', async (req, res) => {
            const cursor = moviesCollection.find().sort({ rating: -1 }).limit(5);
            const result = await cursor.toArray();
            res.send(result);
        });

        //  Latest Movies
        app.get('/latest-movies', async (req, res) => {
            const cursor = moviesCollection.find().sort({ created_at: -1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`MovieMaster Pro server is running on port ${port}`)
})
