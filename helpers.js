import { PythonShell } from 'python-shell';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

export async function findRelevantText(query, chunks) {
    let bestAnswer = '';
    let highestScore = 0;

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
                    else resolve(results);
                });
            });
            console.log('Vector:', vector);

            const question = query;
            const context = chunk;
            const answer = await getAnswerFromLLaMAModel(question, context);

            if (answer.score > highestScore) {
                bestAnswer = answer.text;
                highestScore = answer.score;
            }
        } catch (err) {
            console.error('Error during vectorization:', err);
        }
    }

    return bestAnswer || "Sorry, I couldn't find an answer to your question in the PDF.";
}

export async function getAnswerFromLLaMAModel(question, context) {
    const { LLaMAModel } = await import('./llama_model.py'); // Adjust path as needed
    const model = new LLaMAModel();

    try {
        const answer = model.answer_question(question, context);
        return { text: answer, score: 1 }; // For now, assume score is 1 (basic implementation)
    } catch (error) {
        console.error('Error getting answer from LLaMAModel:', error);
        return { text: '', score: 0 };
    }
}
