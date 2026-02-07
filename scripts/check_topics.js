const mongoose = require('mongoose');
const Question = require('./models/Question');

mongoose.connect('mongodb://localhost:27017/apptitude-db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('Connected');
    try {
        const topics = await Question.distinct('topic');
        console.log('Topics found:', topics);
        
        const count = await Question.countDocuments();
        console.log('Total Questions:', count);
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
})
.catch(err => console.error(err));
