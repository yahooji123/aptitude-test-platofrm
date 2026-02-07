const mongoose = require('mongoose');

// Ye wahi URI hai jo humne Render aur Seed file me use ki hai
const uri = "mongodb+srv://krishhjji7854_db_user:jiRIZR6wtdWKXkBq@cluster0.rgyv7is.mongodb.net/aptitude-project?retryWrites=true&w=majority";

async function checkDatabase() {
    try {
        console.log(" Connecting to MongoDB Atlas...");
        await mongoose.connect(uri);
        console.log(" Connected Successfully!");

        // Database ka naam pata karte hain
        const dbName = mongoose.connection.db.databaseName;
        console.log(`\n Database Name:  ${dbName}`);
        console.log("(Ye wahi folder hai jahan data save ho raha hai)");

        // Collections check karte hain
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("\n Collections found:");
        collections.forEach(c => console.log(` - ${c.name}`));

        // Users count karte hain
        const usersCount = await mongoose.connection.db.collection('users').countDocuments();
        console.log(`\n Total Users Registered: ${usersCount}`);
        
        // Questions count karte hain
        const questionsCount = await mongoose.connection.db.collection('questions').countDocuments();
        console.log(` Total Questions: ${questionsCount}`);

        // Recent User (Agar hai to)
        if (usersCount > 0) {
            const lastUser = await mongoose.connection.db.collection('users').findOne({}, { sort: { createdAt: -1 } });
            console.log(`\n Last Registered User: ${lastUser.name} (${lastUser.email})`);
        }

    } catch (error) {
        console.error(" Error:", error);
    } finally {
        await mongoose.connection.close();
        console.log("\n Connection Closed.");
    }
}

checkDatabase();
