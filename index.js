const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;
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
    res.send('MovieMaster Pro server is running');
});

async function run() {
    try {
        await client.connect();
        const db = client.db('movie_master_pro_db');
        const moviesCollection = db.collection('movies');
        const usersCollection = db.collection('users');

        // Movies APIs
        app.get('/movies', async (req, res) => {
            const { addedBy, genres, minRating, maxRating } = req.query;
            const query = {};

            if (addedBy) {
                query.addedBy = addedBy;
            }

            if (genres) {
                const genreArray = genres.split(',').map(g => g.trim());
                query.genre = { $in: genreArray };
            }

            if (minRating || maxRating) {
                query.rating = {};
                if (minRating) query.rating.$gte = parseFloat(minRating);
                if (maxRating) query.rating.$lte = parseFloat(maxRating);
            }

            const cursor = moviesCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        // Create Movie Info (no auth)
        app.post('/movies', async (req, res) => {
            const newMovie = req.body;
            newMovie.created_at = new Date();
            // You may want to keep addedBy field optional or leave blank
            newMovie.addedBy = newMovie.addedBy || 'anonymous';

            const result = await moviesCollection.insertOne(newMovie);
            res.send(result);
        });

        // Find Specific/One Movie
        app.get('/movies/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await moviesCollection.findOne(query);
            res.send(result);
        });

        // Update a movie (no auth)
        app.patch('/movies/:id', async (req, res) => {
            const id = req.params.id;
            const updatedMovie = req.body;
            const query = { _id: new ObjectId(id) };

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

        // Delete a movie (no auth)
        app.delete('/movies/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await moviesCollection.deleteOne(query);
            res.send(result);
        });

        // Users APIs
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const email = req.body.email;
            const query = { email: email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.status(409).send({ message: 'User already exists' });
            } else {
                const result = await usersCollection.insertOne(newUser);
                res.send(result);
            }
        });

        // Stats
        app.get('/stats', async (req, res) => {
            const totalMovies = await moviesCollection.estimatedDocumentCount();
            const totalUsers = await usersCollection.estimatedDocumentCount();
            const result = { totalMovies, totalUsers };
            res.send(result);
        });

        // Top-Rated Movies
        app.get('/top-rated', async (req, res) => {
            const cursor = moviesCollection.find().sort({ rating: -1 }).limit(5);
            const result = await cursor.toArray();
            res.send(result);
        });

        // Latest Movies
        app.get('/latest-movies', async (req, res) => {
            const cursor = moviesCollection.find().sort({ created_at: -1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result);
        });

        // Watchlist APIs
        app.post('/watchlist', async (req, res) => {
            const { movieId, email } = req.body;

            const existing = await db.collection('watchlist').findOne({ movieId, email });

            if (existing) {
                return res.send({
                    exists: true,
                    message: 'Already in watchlist'
                });
            }

            const result = await db.collection('watchlist').insertOne({
                movieId,
                email,
                addedAt: new Date()
            });

            res.send({
                inserted: true,
                insertedId: result.insertedId
            });
        });



        app.get('/watchlist', async (req, res) => {
            const { email } = req.query;
            const watchlist = await db.collection('watchlist').find({ email }).toArray();
            const movieIds = watchlist.map(item => new ObjectId(item.movieId));
            const movies = await db.collection('movies').find({ _id: { $in: movieIds } }).toArray();
            res.send(movies);
        });

        app.delete('/watchlist/:id', async (req, res) => {
            const { email } = req.query;
            const id = req.params.id;
            const result = await db.collection('watchlist').deleteOne({ movieId: id, email });
            res.send(result);
        });

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`MovieMaster Pro server is running on port ${port}`);
});

