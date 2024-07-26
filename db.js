// db.js
import pkg1 from 'pg';
const { Client } = pkg1;

const client = new Client({
  user: 'doadmin',
  host: 'db-ad3ed706-f1b7-4db7-87de-b5a-do-user-13257295-0.a.db.ondigitalocean.com',
  database: 'defaultdb',
  password: 'AVNS_9ciA2EwlCy69JD55IPL',
  port: 25060,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => console.log('Connected to the database'))
  .catch(err => console.error('Database connection error:', err.stack));

export default client;
