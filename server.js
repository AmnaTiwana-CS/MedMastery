import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { readFileSync } from 'fs';
import pdf from 'pdf-parse';
import client from './db.js'; // Import the client from db.js
import { vectorizeQuery, getMostSimilarVector, generateCompletion } from './helpers.js';


const app = express();

const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/completion', async (req, res) => {

  const query = req.query.query
  const nPredict = req.query.nPredict	
  console.log(query);
  try {
    console.log("Vectorizing query...");
    
    const sampleQueryResult = await vectorizeQuery(query);
    console.log("Sample query result:", sampleQueryResult);

    if (Array.isArray(sampleQueryResult) && sampleQueryResult.length === 384) {
      console.log("Vector length:", sampleQueryResult.length);
      console.log("Fetching the most similar vector from the database...");
      
      const retrievedChunk = await getMostSimilarVector(sampleQueryResult);

      if (retrievedChunk) {
        console.log("Retrieved chunk:", retrievedChunk.chunk);
        console.log("Generating completion...");

        res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders(); // flush the headers to establish SSE with the client

        await generateCompletion(query, retrievedChunk.chunk, (chunk) => {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        });

        res.on('close', () => {
          console.log(res)
          res.end(); // Ensure res.end() is called when the client closes the connection
        });
          
      } else {
        console.error("No similar vector found in the database.");
        res.status(404).json({ error: 'No similar vector found in the database.' });
      }
    } else {
      console.error(`Vector length is not 384, actual length: ${sampleQueryResult ? sampleQueryResult.length : 'undefined'}`);
      res.status(400).json({ error: 'Invalid vector length.' });
    }
  } catch (error) {
    console.error("Error in main function:", error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

