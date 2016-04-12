var express = require('express');
var fs = require('fs');
var mongoose = require('mongoose');
var app = express();

const spawn = require('child_process').spawn;
const exec = require('child_process').exec;

mongoose.connect('mongodb://localhost:27017/simple-server');

var visitorSchema = mongoose.Schema({user: {type: String, unique: true}, run: Array});
var Visitor = mongoose.model('Visitor', visitorSchema);

var currentUsers = [];

app.get('/source', function(req, res) {
    res.download('./index.js');
});

app.get('/', function(req, res) {
    // TODO: replace w/ simple index.html
    res.end('Welcome to my simple SSH-ish server. Navigate to /bash/:user/:command to run a single command.');
});

// POST is preferable here
app.get('/signup', function(req, res) {
    var _vistor = new Visitor({user: req.query.user, run: []});
    _vistor.save(function(err) {
        if (err) {
            console.log(JSON.stringify(err));
            return;
        }
    });
    console.log(JSON.stringify(_visitor));
    res.json(_vistor);
});

// thanks to https://nodejs.org/api/child_process.html#child_process_child_process_execfile_file_args_options_callback
app.get('/bash/:user/:command', function (req, res) {
    var command = req.params.command;
    var user = req.params.user;
    var child = exec(command, (error, stdout, stderr) => {
        res.json(stdout);
        
        if (error) {
            console.log(error);
            return;
        }

        console.log(user + " ran " + command);

        var result = {command: command,
            date: new Date(),
            stdout_result: stdout,
            stderr_result: stderr
        };
        
        // thanks to http://stackoverflow.com/questions/7267102/how-do-i-update-upsert-a-document-in-mongoose
        Visitor.findOneAndUpdate({user: user}, {$push: {run: result}}, {upsert:true}, function (err, doc) {
            if (err) {
                console.log(err);
                return;
            }
        });
    });
});


app.get('/bash/:user', function(req, res) {
    var user = req.params.user;

    if (currentUsers.indexOf(user) == -1) {
        currentUsers.push(user);
        console.log(user + " just spun up a bash session");

        var bash = spawn('bash', ['-i']);

        bash.stdout.on('data', (data) => {
            res.json(data.toString());
        });

        app.get('/session/:user/:command', function (req2, res2) {
            var command = req2.params.command;
            var userAuth = req2.params.user;
            if (userAuth == user) {
                bash.stdin.write(command);
                console.log(userAuth + " ran " + command + " on their bash session");
                bash.stdin.end();
            } 
        });
    }

    else {
        res.end();
    }
});


console.log('Listening on localhost:5001');
app.listen(5001);
