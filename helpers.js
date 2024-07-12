import { PythonShell } from 'python-shell';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to chunk text by sentences
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

// Function to insert data into PostgreSQL
export async function insertData(client, query, text, vector) {
    try {
        await client.query('INSERT INTO texts (query, text, vector) VALUES ($1, $2, $3)', [query, text, vector]);
        console.log('Inserted relevant text and vector into database.');
    } catch (err) {
        console.error('Error inserting into database:', err);
    }
}

// Function to retrieve data from PostgreSQL
export async function retrieveData(client, query) {
    try {
        const result = await client.query('SELECT text, vector FROM texts WHERE query = $1', [query]);
        if (result.rows.length > 0) {
            return result.rows[0];
        } else {
            return null;
        }
    } catch (err) {
        console.error('Error retrieving data from database:', err);
        return null;
    }
}

// Function to find the most relevant text
export async function findRelevantText(query, chunks, client) {
    let bestAnswer = '';
    let highestScore = 0;
    let bestVector = '';

    // Check if the query result is already in the database
    const cachedResult = await retrieveData(client, query);
    if (cachedResult) {
        return cachedResult.text;
    }

    for (const chunk of chunks) {
        try {
            const options = {
                mode: 'text',
                pythonPath: 'C:\\Python312\\python.exe',
                scriptPath: __dirname,
                args: [chunk],
            };

            const vector = await new Promise((resolve, reject) => {
                PythonShell.run('vectorize.py', options, (err, results) => {
                    if (err) reject(err);
                    else resolve(JSON.parse(results[0]));
                });
            });
            console.log('Vector:', vector);

            const answer = await getAnswerFromLLaMAModel(query, chunk);

            if (answer.score > highestScore) {
                bestAnswer = answer.text;
                highestScore = answer.score;
                bestVector = JSON.stringify(vector);
            }
        } catch (err) {
            console.error('Error during vectorization:', err);
        }
    }

    if (bestAnswer) {
        await insertData(client, query, bestAnswer, bestVector);
    }

    return bestAnswer || "Sorry, I couldn't find an answer to your question in the PDF.";
}

// Function to get an answer from the LLaMAModel
export async function getAnswerFromLLaMAModel(question, context) {
    // Running the LLaMAModel as a separate Python process
    const options = {
        mode: 'text',
        pythonPath: 'C:\\Python312\\python.exe',
        scriptPath: __dirname,
        args: [question, context],
    };

    return new Promise((resolve, reject) => {
        PythonShell.run('llama_model.py', options, (err, results) => {
            if (err) {
                console.error('Error getting answer from LLaMAModel:', err);
                reject({ text: '', score: 0 });
            } else {
                const answer = results[0]; // Assuming results[0] contains the answer
                resolve({ text: answer, score: 1 }); // Basic implementation with a fixed score
            }
        });
    });
}
