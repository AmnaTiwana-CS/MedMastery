import { chunkTextBySentence, readPdf, vectorizeQuery, vectorizeChunks} from './helpers.js'; 

const pdftext = await readPdf("./pdfs/Cardiac tamponade - Course handbook.pdf")
const chunks = chunkTextBySentence(pdftext)
vectorizeChunks(chunks)