const connection = require('./db-config');
const express = require('express');
const { setupRoutes } = require('./routes');
const app = express();

const port = process.env.PORT || 5001;

connection.connect((err) => {
  if (err) {
    console.error('error connecting: ' + err.stack);
  } else {
    console.log('connected as id ' + connection.threadId);
  }
});

app.use(express.json());

//Routes
setupRoutes(app);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
