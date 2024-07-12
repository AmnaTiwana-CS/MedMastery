import express from 'express';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { chunkTextBySentence, findRelevantText, insertData, retrieveData } from './helpers.js'; // Adjust path as needed

dotenv.config();

// Define __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// PostgreSQL client setup
const { Client } = pg;
const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

client.connect();

app.get('/', (req, res) => {
    res.send('Server is running!');
});

app.post('/chat', async (req, res) => {
    const { message } = req.body;
    console.log('Received message:', message);

    try {
        const pdfPath = path.resolve(__dirname, 'pdfs', 'Cardiac tamponade - Course handbook.pdf');
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF file not found at path: ${pdfPath}`);
        }

        const { default: pdfParse } = await import('pdf-parse');
        const pdfBuffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(pdfBuffer);

        const textChunks = chunkTextBySentence(data.text);
        const relevantText = await findRelevantText(message, textChunks, client);

        res.json({ reply: relevantText });
    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).send(`Error processing message: ${error.message}`);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    client.query(`
        DROP TABLE IF EXISTS texts;
        CREATE TABLE texts (
            id SERIAL PRIMARY KEY,
            query TEXT NOT NULL,
            text TEXT NOT NULL,
            vector JSONB NOT NULL
        )
    `, (err, res) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Table created or already exists');
        }
    });
});
