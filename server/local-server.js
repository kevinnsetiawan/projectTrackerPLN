import 'dotenv/config';
import http from 'http';
import app from '../api/index.js';

const port = process.env.PORT || 4000;
http.createServer(app).listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});