const mongoose = require('mongoose');
const Question = require('./models/Question');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("Connected to DB");
        const count = await Question.countDocuments();
        console.log("Total Questions:", count);
        if (count > 0) {
            const topics = await Question.distinct('topic');
            console.log("Distinct Topics:", topics);
            const sample = await Question.findOne();
            console.log("Sample Question:", sample);
        }
        mongoose.disconnect();
    })
    .catch(err => console.error("DB Error:", err));