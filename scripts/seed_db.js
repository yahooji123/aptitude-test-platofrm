const mongoose = require('mongoose');
const Question = require('./models/Question');

const questions = [
    // Quantitative Aptitude
    {
        questionText: "What is 20% of 150?",
        options: ["20", "25", "30", "35"],
        correctOption: 2,
        topic: "Quantitative Aptitude",
        difficulty: "easy"
    },
    {
        questionText: "If a car travels at 60 km/h, how far will it travel in 2.5 hours?",
        options: ["120 km", "150 km", "100 km", "180 km"],
        correctOption: 1,
        topic: "Quantitative Aptitude",
        difficulty: "medium"
    },
    {
        questionText: "The average of 5 numbers is 20. If one number is removed, the average becomes 15. What is the removed number?",
        options: ["40", "35", "30", "45"],
        correctOption: 0,
        topic: "Quantitative Aptitude",
        difficulty: "hard"
    },

    // Logical Reasoning
    {
        questionText: "Find the next number in the series: 2, 4, 8, 16, ...",
        options: ["24", "32", "20", "30"],
        correctOption: 1,
        topic: "Logical Reasoning",
        difficulty: "easy"
    },
    {
        questionText: "Statement: All cats are dogs. All dogs are birds. Conclusion: All cats are birds.",
        options: ["True", "False", "Cannot be determined", "None of these"],
        correctOption: 0,
        topic: "Logical Reasoning",
        difficulty: "medium"
    },
    
    // Verbal Ability
    {
        questionText: "Choose the synonym of: HAPPY",
        options: ["Sad", "Joyful", "Angry", "Tired"],
        correctOption: 1,
        topic: "Verbal Ability",
        difficulty: "easy"
    },
    {
        questionText: "Identify the tense: 'He has been working here for two years.'",
        options: ["Present Continuous", "Present Perfect", "Present Perfect Continuous", "Past Perfect"],
        correctOption: 2,
        topic: "Verbal Ability",
        difficulty: "medium"
    },

    // Java Programming
    {
        questionText: "Which of these is not a primitive data type in Java?",
        options: ["int", "float", "boolean", "String"],
        correctOption: 3,
        topic: "Java Programming",
        difficulty: "easy"
    },
    {
        questionText: "What relates to the concept of Polymorphism?",
        options: ["Static binding", "Dynamic binding", "Both", "None"],
        correctOption: 2,
        topic: "Java Programming",
        difficulty: "hard"
    }
];

// Use environment variable or default to local
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/apptitude-db';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log(`Connected to DB: ${MONGO_URI}`);
    await Question.deleteMany({}); // Clear existing
    console.log('Cleared existing questions');
    
    await Question.insertMany(questions);
    console.log(`Inserted ${questions.length} questions`);
    
    mongoose.connection.close();
})
.catch(err => console.error(err));
