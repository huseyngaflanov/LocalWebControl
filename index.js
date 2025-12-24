const express = require('express');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// host htmls in public folder
app.use(express.static('public'));



// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

module.exports = app;