//import { chunkTextBySentence, vectorizeQuery, getMostSimilarVector} from './helpers.js'; 
//const sampleQuery = "normal pressures"
//const sampleQueryVector = await vectorizeQuery(sampleQuery)
//const innerSampleQueryVector = sampleQueryVector.embeddings[0]
//const retrievedChunk = await getMostSimilarVector(innerSampleQueryVector)
//console.log(retrievedChunk)

///////
// rag.js
// Import necessary functions from helpers.js
// Import necessary functions from helpers.js
import { vectorizeQuery, getMostSimilarVector, generateCompletion } from './helpers.js';

async function main(query) {
  try {
    console.log("Starting main function...");
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
        
        const completionResult = await generateCompletion(query, retrievedChunk.chunk);
        console.log("Completion result:", completionResult);
      } else {
        console.error("No similar vector found in the database.");
      }
    } else {
      console.error(`Vector length is not 384, actual length: ${sampleQueryResult ? sampleQueryResult.length : 'undefined'}`);
    }
  } catch (error) {
    console.error("Error in main function:", error);
  }
}

// Call the main function with any query
const query = "Any conditions associated with pericardial effusion";  // Replace this with any query
main(query);

