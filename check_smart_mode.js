const mongoose = require('mongoose');
const SystemSetting = require('./models/SystemSetting');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('MongoDB Connected');
    
    const setting = await SystemSetting.findOne({ key: 'smartPracticeMode' });
    console.log('Current Setting:', setting);
    
    if (!setting) {
        console.log('Setting not found. Creating it...');
        await SystemSetting.create({
            key: 'smartPracticeMode',
            value: true, // Default to active
            description: 'Prioritize unseen questions in adaptive tests'
        });
        console.log('Created smartPracticeMode = true');
    } else {
        if (!setting.value) {
            console.log('Setting is disabled. Enabling it...');
            setting.value = true;
            await setting.save();
             console.log('Updated smartPracticeMode = true');
        } else {
            console.log('Setting is already enabled.');
        }
    }
    
    process.exit();
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
