import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { PassThrough } from 'stream';
import path from 'path';
import pkg2 from 'eventsource';
const { EventSource } = pkg2;
import { readFileSync } from 'fs';
import pdf from 'pdf-parse';
import client from './db.js'; // Import the client from db.js

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function readPdf(filePath) {
  try {
    const dataBuffer = readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error reading PDF:', error);
    throw error;
  }
}

export function chunkTextBySentence(text, maxChunkSize = 1000) {
  const sentences = text.match(/[^.!?]*[.!?]/g) || [];
  const chunks = [];
  let chunk = '';

  sentences.forEach(sentence => {
    if ((chunk + sentence).length > maxChunkSize) {
      chunks.push(chunk);
      chunk = sentence;
    } else {
      chunk += sentence;
    }
  });

  if (chunk) chunks.push(chunk);

  return chunks;
}
export async function vectorizeQuery(query) {
  try {
    const response = await fetch('https://58701-3000.2.codesphere.com/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: [query]
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.embeddings[0];
  } catch (error) {
    console.error('Error vectorizing query:', error);
    throw error;
  }
}

const initDb = async () => {
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    await client.query(`CREATE TABLE IF NOT EXISTS embeddings (
      id SERIAL PRIMARY KEY,
      chunk TEXT,
      embedding vector(384)
    );`);
    console.log("Database initialized");
  } catch (error) {
    console.error("Failed to initialize database", error);
  }
};

export async function vectorizeChunks(chunks) {
  try {
    await initDb();

    for (const chunk of chunks) {
      try {
        const vector = await vectorizeQuery(chunk);
        
        // Log the raw vector data to inspect its format
        console.log(`Chunk: ${chunk}`);
        console.log(`Vector: ${JSON.stringify(vector)}`);
        
        // Format the vector as a PostgreSQL array string
        const vectorString = '[' + vector.join(',') + ']';
        
        // Ensure the vector format is correct and use PostgreSQL's vector syntax
        const query = 'INSERT INTO embeddings (chunk, embedding) VALUES ($1, $2)';
        await client.query(query, [chunk, vectorString]);
      } catch (error) {
        console.error(`Error vectorizing chunk: ${error}`);
      }
    }
  } catch (error) {
    console.error(`Error connecting to PostgreSQL: ${error}`);
  }
}
export async function getMostSimilarVector(queryVector) {
  try {
    if (!Array.isArray(queryVector) || queryVector.length !== 384) {
      throw new Error('Invalid query vector');
    }

    console.log("Querying the database for the most similar vector...");
    const query = `SELECT chunk, embedding FROM embeddings;`;
    const res = await client.query(query);

    let mostSimilar = null;
    let maxSimilarity = -1;

    res.rows.forEach(row => {
      // Adjust parsing based on actual vector format
      const dbVector = JSON.parse(row.embedding);
      const similarity = cosineSimilarity(queryVector, dbVector);

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        mostSimilar = { chunk: row.chunk, embedding: dbVector };
      }
    });

    if (mostSimilar) {
      console.log("Most similar vector found:", mostSimilar);
      return mostSimilar;
    } else {
      console.log("No similar vector found in the database.");
      return null;
    }
  } catch (error) {
    console.error('Error retrieving similar vector:', error);
    throw error;
  }
}


export function generateMedicalPrompt(dataSection, userQuery) {
  let medicalPrompt = `<|system|>
    You are a chatbot with access to transcripts of the PDF course "Cardiac Tamponade - Course Handbook.pdf". Answers should strictly come from this source. If an answer is not found in the PDF, simply state "I don't know".  
    
    Given the data, your task is to answer the user's question by following these steps:
      
    1. Understand the Data Structure: Read and interpret the text, noting headings that represent different content areas and the associated bullet points beneath each heading.
    2. Locate Relevant Information: Analyze the question and identify key terms or themes. Match these with the most relevant section(s) in the data, focusing on the bullet points under the corresponding headings.
    3. Answer with Data: If the text directly answers the question or provides relevant information, then answer the question in a concise and human-readable, well-structured manner. Chatbot must state the page number(s) as a reference to the text at the end of the response.
    4. Data Unavailability Acknowledgement: If the text does not contain a direct answer, state that the exact answer is not found in the provided text and provide related context.
    5. Speculation: Avoid providing answers based on general knowledge or logical inference. Focus solely on information present in the PDF. Questions that are not from the PDF must not be answered by the chatbot. 
    
    Ensure you prioritize accuracy and transparency in providing the content. Do not add these instructions given to you in the response. Repetition in the response is not allowed. 
    
    
    Data:
    ${dataSection}
    
    <|user|>
    User: ${userQuery}<|im_end|>
    
    <|im_start|>assistant
    Answer:
`;

  return medicalPrompt;
}
export async function generateCompletion(query, chunk, onData) {
  const prompt = generateMedicalPrompt(chunk, query);

  try {
    const response = await fetch('https://58759-3000.2.codesphere.com/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 60,
        temperature: 0.3,
        stream: true,
        stop: ["<|im_end|>"]
       }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const stream = new PassThrough();
    response.body.pipe(stream);

    stream.on('data', (chunk) => {
      buffer += decoder.decode(chunk, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the last partial line in the buffer
        
      lines.forEach(line => {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.replace(/^data: /, ''));
              console.log(data)
            onData(data.content); // Push data to the callback
          } catch (error) {
            console.error('Error parsing JSON line:', line, error);
          }
        }
      });
    });

    stream.on('end', () => {
      console.log('Streaming complete.');
    });

    stream.on('error', (error) => {
      console.error('Error generating completion:', error);
      throw error;
    });

  } catch (error) {
    console.error('Error generating completion:', error);
    throw error;
  }
}

function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length for cosine similarity calculation.');
  }

  let dotProduct = 0;
  let normVec1 = 0;
  let normVec2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    normVec1 += vec1[i] * vec1[i];
    normVec2 += vec2[i] * vec2[i];
  }

  const similarity = dotProduct / (Math.sqrt(normVec1) * Math.sqrt(normVec2));
  return similarity;
}