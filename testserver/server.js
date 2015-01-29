var express = require('express'),
    cors = require('cors');

var app = express();

app.use(cors());
app.use('/', express.static(__dirname));

// Start the server
app.listen(7777);
