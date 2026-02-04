const mongoose = require('mongoose');
const Question = require('./models/Question');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("Connected");
        try {
            const topics = await Question.distinct('topic');
            console.log("Topics:", topics);
        } catch (e) {
            console.error("Error fetching topics:", e);
        }
        mongoose.disconnect();
    })
    .catch(err => console.error("DB Connection Error:", err));
    