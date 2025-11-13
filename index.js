const express = require('express')
const cors = require('cors')
const admin = require("firebase-admin");
require('dotenv').config()
const app = express()
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const serviceAccount = require("./movie-master-pro-firebase-adminsdk.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(cors());
app.use(express.json());



// Firebase Auth Token Verification

const verifyFirebaseToken = async (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }

    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }

    try {
        const userInfo = await admin.auth().verifyIdToken(token);
        req.token_email = userInfo.email;
        next()
    }

    catch (err) {
        return res.status(401).send({ message: 'Unauthorized Access' });
    }

}


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
            const { addedBy, genres, minRating, maxRating } = req.query;
            const query = {};

            // Filter by who added the movie
            if (addedBy) {
                query.addedBy = addedBy;
            }

            // Filter by multiple genres using $in
            if (genres) {
                const genreArray = genres.split(',').map(g => g.trim());
                query.genre = { $in: genreArray };
            }

            // Filter by rating range using $gte and $lte
            if (minRating || maxRating) {
                query.rating = {};
                if (minRating) query.rating.$gte = parseFloat(minRating);
                if (maxRating) query.rating.$lte = parseFloat(maxRating);
            }

            const cursor = moviesCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });



        //   Create Movie Info
        app.post('/movies', verifyFirebaseToken, async (req, res) => {
            const newMovie = req.body;
            newMovie.created_at = new Date();

            newMovie.addedBy = req.token_email;

            const result = await moviesCollection.insertOne(newMovie);
            res.send(result);
        });

        //   Find Specific/One Movie
        app.get('/movies/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await moviesCollection.findOne(query)
            res.send(result)
        })

        // Update a movie
        app.patch('/movies/:id', verifyFirebaseToken, async (req, res) => {
            const id = req.params.id;
            const updatedMovie = req.body;
            const query = { _id: new ObjectId(id) };

            const existing = await moviesCollection.findOne({ _id: new ObjectId(id) });
            if (existing.addedBy !== req.token_email) {
                return res.status(403).send({ message: 'Forbidden Access' });
            }

            const update = {
                $set: {
                    title: updatedMovie.title,
                    genre: updatedMovie.genre,
                    rating: updatedMovie.rating,
                    releaseYear: updatedMovie.releaseYear,
                    duration: updatedMovie.duration,
                    language: updatedMovie.language,
                    country: updatedMovie.country,
                    director: updatedMovie.director,
                    cast: updatedMovie.cast,
                    posterUrl: updatedMovie.posterUrl,
                    plotSummary: updatedMovie.plotSummary
                }
            };

            const result = await moviesCollection.updateOne(query, update);
            res.send(result);
        });


        // Delete a movie
        app.delete('/movies/:id', verifyFirebaseToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const existing = await moviesCollection.findOne({ _id: new ObjectId(id) });

            if (!existing) {
                return res.status(404).send({ message: 'Movie not found' });
            }
            if (existing.addedBy !== req.token_email) {
                return res.status(403).send({ message: 'Forbidden Access' });
            }

            const result = await moviesCollection.deleteOne(query);
            res.send(result);
        });


        // Users APIS
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const email = req.body.email;
            const query = { email: email }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.status(409).send({ message: 'User already exists' });

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
