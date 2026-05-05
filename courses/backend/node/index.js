import express from 'express';
import fs from 'fs';

const app = express();
const textFilePath = './Volumes/Code/hyf/test.txt';

app.use(express.json());

app.get('/', (req, res) => {
    console.log('Hello');
    const fileContent = fs.readFileSync(textFilePath, 'utf-8');
    console.log(fileContent);
    res.send('jgkhkvjk');
});
app.post('/write', (req, res) => {
    const text = req.body.text;
    const name = req.body.name;
    if (!text) {
        res.send('not Today');
        return;
    }
    else if (!name) {
        res.status(400).send('Name is required');
        return;
    }
    else {
        const contentToWrite = `Name: ${name}, Text: ${text}\n`;
        fs.appendFileSync(textFilePath, contentToWrite);
        console.log(req.query);
        res.send('Query received');
    }

});


app.listen(3000, () => {
    console.log('ready');
});
